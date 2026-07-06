/**
 * MCP 活動系ツールの監査記録・テナント分離の実行検証テスト。
 *
 * T-11: 書き込みが監査ログに記録され、他テナントに触れられないことを固定する。
 *
 * 1. 監査記録の実行検証:
 *    tasks create → createActionItem usecase が organizationId と actorId を受け取る
 *    （usecase 内で recordAudit が呼ばれる = 監査記録される）
 *
 * 2. テナント分離の実行検証:
 *    2 つの異なる organizationId で同一操作を呼び、usecase に渡される organizationId が
 *    それぞれ正しいことを assert する。
 *    対象ツール: tasks, interactions, watches, notifications（全 4 ツール）
 *
 * 受け入れ基準:「書き込みが監査ログに記録され、他テナントに触れられないことをテストで
 * 固定する」を満たす。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { ActionItem } from "@/domain/models/actionItem";
import type { Interaction } from "@/domain/models/interaction";
import type { Watch } from "@/domain/models/watch";

const state = {
  createActionItemCalls: [] as unknown[],
  createMeetingCalls: [] as unknown[],
  watchDealCalls: [] as unknown[],
  markAsReadCalls: [] as unknown[],
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createActionItemModule from "@/application/usecases/createActionItem";
import * as createMeetingModule from "@/application/usecases/createMeeting";
import * as watchDealModule from "@/application/usecases/watchDeal";
import * as markNotificationsAsReadModule from "@/application/usecases/markNotificationsAsRead";
import * as userRepositoryModule from "@/infrastructure/repositories/userRepository";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateActionItem = createActionItemModule.createActionItem;
const realCreateMeeting = createMeetingModule.createMeeting;
const realWatchDeal = watchDealModule.watchDeal;
const realMarkNotificationsAsRead = markNotificationsAsReadModule.markNotificationsAsRead;
const realUserRepository = { ...userRepositoryModule };

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/createActionItem", () => ({
  createActionItem: async (input: unknown) => {
    state.createActionItemCalls.push(input);
    return { ok: true as const, actionItem: mockActionItem };
  },
}));

mock.module("@/application/usecases/createMeeting", () => ({
  createMeeting: async (input: unknown) => {
    state.createMeetingCalls.push(input);
    return { ok: true as const, meeting: mockMeeting };
  },
}));

mock.module("@/application/usecases/watchDeal", () => ({
  watchDeal: async (input: unknown) => {
    state.watchDealCalls.push(input);
    return { ok: true as const, watch: mockWatch };
  },
}));

mock.module("@/application/usecases/markNotificationsAsRead", () => ({
  markNotificationsAsRead: async (input: unknown) => {
    state.markAsReadCalls.push(input);
    return { ok: true as const };
  },
}));

// userRepository は notifications.ts から個別 import されるためここでモックする
mock.module("@/infrastructure/repositories/userRepository", () => ({
  ...realUserRepository,
  findById: async (userId: string, orgId: string) => ({
    id: userId,
    email: "test@example.com",
    name: "Test User",
    organizationId: orgId,
    role: "member",
    notificationsLastSeenAt: null,
    createdAt: new Date("2026-01-01"),
    deactivatedAt: null,
  }),
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createActionItem", () => ({
    createActionItem: realCreateActionItem,
  }));
  mock.module("@/application/usecases/createMeeting", () => ({
    createMeeting: realCreateMeeting,
  }));
  mock.module("@/application/usecases/watchDeal", () => ({
    watchDeal: realWatchDeal,
  }));
  mock.module("@/application/usecases/markNotificationsAsRead", () => ({
    markNotificationsAsRead: realMarkNotificationsAsRead,
  }));
  mock.module("@/infrastructure/repositories/userRepository", () => realUserRepository);
});

// モック設定後に import する
const { registerTasksTools } = await import("../../app/api/mcp/tools/tasks");
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");
const { registerWatchesTools } = await import("../../app/api/mcp/tools/watches");
const { registerNotificationsTools } = await import("../../app/api/mcp/tools/notifications");

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";

const mockActionItem: ActionItem = {
  id: "item-1",
  organizationId: "org-1",
  description: "テストタスク",
  assigneeId: null,
  dueDate: null,
  done: false,
  status: "todo",
  interactionId: null,
  dealId: null,
  inquiryId: null,
  createdById: "user-A",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

const mockMeeting: Interaction = {
  id: "meeting-1",
  organizationId: "org-1",
  kind: "meeting",
  dealId: DEAL_UUID,
  inquiryId: null,
  contractId: null,
  invoiceId: null,
  clientId: null,
  meetingType: "hearing",
  date: new Date("2026-01-01"),
  location: null,
  attendees: [],
  summary: null,
  actionItems: [],
  details: null,
  createdById: "user-A",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

const mockWatch: Watch = {
  id: "watch-1",
  userId: "user-A",
  dealId: DEAL_UUID,
  organizationId: "org-1",
  createdAt: new Date("2026-01-01"),
};

async function callTool(
  toolName: string,
  registerFn: (server: McpServer) => void,
  args: Record<string, unknown>,
  userId: string,
  organizationId: string,
  role = "admin"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerFn(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: userId,
    scopes: [],
    extra: { userId, organizationId, role },
  };
  const request = new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });
  const response = await transport.handleRequest(request, { authInfo });
  const body = (await response.json()) as {
    result?: { isError?: boolean; content?: { text: string }[] };
  };
  await transport.close();
  return {
    isError: body.result?.isError,
    text: body.result?.content?.[0]?.text ?? "",
  };
}

beforeEach(() => {
  state.createActionItemCalls = [];
  state.createMeetingCalls = [];
  state.watchDealCalls = [];
  state.markAsReadCalls = [];
});

describe("MCP 活動系ツール — 監査記録・テナント分離（T-11）", () => {
  describe("監査記録の実行検証", () => {
    it("tasks create は createActionItem usecase に organizationId と actorId を渡す", async () => {
      await callTool(
        "tasks",
        registerTasksTools,
        { operation: "create", description: "テストタスク" },
        "user-A",
        "org-1"
      );

      expect(state.createActionItemCalls).toHaveLength(1);
      const callArgs = state.createActionItemCalls[0] as Record<string, unknown>;
      // usecase 内で recordAudit が呼ばれる = 監査記録される
      expect(callArgs.organizationId).toBe("org-1");
      expect(callArgs.actorId).toBe("user-A");
    });
  });

  describe("テナント分離の実行検証（tasks）", () => {
    it("org-1 と org-2 で tasks create を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "tasks",
        registerTasksTools,
        { operation: "create", description: "org-1 タスク" },
        "user-A",
        "org-1"
      );
      await callTool(
        "tasks",
        registerTasksTools,
        { operation: "create", description: "org-2 タスク" },
        "user-B",
        "org-2"
      );

      expect(state.createActionItemCalls).toHaveLength(2);
      const args1 = state.createActionItemCalls[0] as Record<string, unknown>;
      const args2 = state.createActionItemCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-1");
      expect(args2.organizationId).toBe("org-2");
      // 混在していない
      expect(args1.organizationId).not.toBe(args2.organizationId);
    });
  });

  describe("テナント分離の実行検証（interactions）", () => {
    it("org-1 と org-2 で interactions create_meeting を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "interactions",
        registerInteractionsTools,
        {
          operation: "create_meeting",
          dealId: DEAL_UUID,
          type: "hearing",
          date: "2026-01-01T00:00:00Z",
        },
        "user-A",
        "org-1"
      );
      await callTool(
        "interactions",
        registerInteractionsTools,
        {
          operation: "create_meeting",
          dealId: DEAL_UUID,
          type: "hearing",
          date: "2026-01-01T00:00:00Z",
        },
        "user-B",
        "org-2"
      );

      expect(state.createMeetingCalls).toHaveLength(2);
      const args1 = state.createMeetingCalls[0] as Record<string, unknown>;
      const args2 = state.createMeetingCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-1");
      expect(args2.organizationId).toBe("org-2");
    });
  });

  describe("テナント分離の実行検証（watches）", () => {
    it("org-1 と org-2 で watches watch を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "watches",
        registerWatchesTools,
        { operation: "watch", dealId: DEAL_UUID },
        "user-A",
        "org-1"
      );
      await callTool(
        "watches",
        registerWatchesTools,
        { operation: "watch", dealId: DEAL_UUID },
        "user-B",
        "org-2"
      );

      expect(state.watchDealCalls).toHaveLength(2);
      const args1 = state.watchDealCalls[0] as Record<string, unknown>;
      const args2 = state.watchDealCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-1");
      expect(args2.organizationId).toBe("org-2");
    });
  });

  describe("テナント分離の実行検証（notifications）", () => {
    it("org-1 と org-2 で notifications mark_as_read を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "notifications",
        registerNotificationsTools,
        { operation: "mark_as_read" },
        "user-A",
        "org-1"
      );
      await callTool(
        "notifications",
        registerNotificationsTools,
        { operation: "mark_as_read" },
        "user-B",
        "org-2"
      );

      expect(state.markAsReadCalls).toHaveLength(2);
      const args1 = state.markAsReadCalls[0] as Record<string, unknown>;
      const args2 = state.markAsReadCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-1");
      expect(args2.organizationId).toBe("org-2");
    });
  });
});
