/**
 * MCP tasks ツールの実行検証テスト。
 *
 * T-08: タスクの CRUD・ステータス遷移が Server Action と同一の認可判定になることを固定する。
 *  - canPerform(member, actionItem, delete) = false → member は delete が拒否される
 *  - canPerform(admin, actionItem, delete) = true → admin は delete が usecase に到達する
 *  - canPerform(member, actionItem, create) = true → member は create が usecase に到達する
 *  - updateActionItemStatus usecase が status 遷移で到達することを確認
 *
 * 受け入れ基準:「タスクの CRUD・ステータス遷移が Server Action と同一の認可判定になること
 * をテストで固定する」を満たす。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { ActionItem } from "@/domain/models/actionItem";

const state = {
  deleteActionItemCalls: [] as unknown[],
  createActionItemCalls: [] as unknown[],
  updateActionItemStatusCalls: [] as unknown[],
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as deleteActionItemModule from "@/application/usecases/deleteActionItem";
import * as createActionItemModule from "@/application/usecases/createActionItem";
import * as updateActionItemStatusModule from "@/application/usecases/updateActionItemStatus";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realDeleteActionItem = deleteActionItemModule.deleteActionItem;
const realCreateActionItem = createActionItemModule.createActionItem;
const realUpdateActionItemStatus = updateActionItemStatusModule.updateActionItemStatus;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/deleteActionItem", () => ({
  deleteActionItem: async (input: unknown) => {
    state.deleteActionItemCalls.push(input);
    return { ok: true as const };
  },
}));

mock.module("@/application/usecases/createActionItem", () => ({
  createActionItem: async (input: unknown) => {
    state.createActionItemCalls.push(input);
    return { ok: true as const, actionItem: mockActionItem };
  },
}));

mock.module("@/application/usecases/updateActionItemStatus", () => ({
  updateActionItemStatus: async (input: unknown) => {
    state.updateActionItemStatusCalls.push(input);
    return { ok: true as const, actionItem: { ...mockActionItem, status: "in_progress" } };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/deleteActionItem", () => ({
    deleteActionItem: realDeleteActionItem,
  }));
  mock.module("@/application/usecases/createActionItem", () => ({
    createActionItem: realCreateActionItem,
  }));
  mock.module("@/application/usecases/updateActionItemStatus", () => ({
    updateActionItemStatus: realUpdateActionItemStatus,
  }));
});

// モック設定後に import する
const { registerTasksTools } = await import("../../app/api/mcp/tools/tasks");

const ITEM_UUID = "123e4567-e89b-12d3-a456-426614174001";

const mockActionItem: ActionItem = {
  id: ITEM_UUID,
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

async function callTasks(
  args: Record<string, unknown>,
  role = "admin",
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerTasksTools(server);
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
      params: { name: "tasks", arguments: args },
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
  state.deleteActionItemCalls = [];
  state.createActionItemCalls = [];
  state.updateActionItemStatusCalls = [];
});

describe("MCP tasks ツール — 認可判定（T-08）", () => {
  it("member ロールで delete を呼ぶと isError で拒否され deleteActionItem usecase に到達しない", async () => {
    const result = await callTasks(
      { operation: "delete", id: ITEM_UUID },
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    // usecase には到達しない
    expect(state.deleteActionItemCalls).toHaveLength(0);
  });

  it("admin ロールで delete を呼ぶと deleteActionItem usecase に到達する（TC-011）", async () => {
    const result = await callTasks(
      { operation: "delete", id: ITEM_UUID },
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.deleteActionItemCalls).toHaveLength(1);
    const callArgs = state.deleteActionItemCalls[0] as Record<string, unknown>;
    expect(callArgs.id).toBe(ITEM_UUID);
    expect(callArgs.organizationId).toBe("org-1");
  });

  it("member ロールで create を呼ぶと createActionItem usecase に到達する（create は全ロールで可）", async () => {
    const result = await callTasks(
      { operation: "create", description: "テストタスク" },
      "member"
    );

    expect(result.isError).toBeUndefined();
    expect(state.createActionItemCalls).toHaveLength(1);
    const callArgs = state.createActionItemCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe("org-1");
    expect(callArgs.actorId).toBe("user-A");
    expect(callArgs.description).toBe("テストタスク");
  });

  it("update_status でステータス遷移が updateActionItemStatus usecase に到達する", async () => {
    const result = await callTasks(
      { operation: "update_status", id: ITEM_UUID, status: "in_progress" },
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.updateActionItemStatusCalls).toHaveLength(1);
    const callArgs = state.updateActionItemStatusCalls[0] as Record<string, unknown>;
    expect(callArgs.id).toBe(ITEM_UUID);
    expect(callArgs.status).toBe("in_progress");
    expect(callArgs.organizationId).toBe("org-1");
  });
});
