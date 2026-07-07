/**
 * MCP 承認系ツールの認可 runtime テスト（T-08, T-12）。
 *
 * T-08: 受け入れ基準「資格のないユーザーの承認・却下が拒否されることをテストで固定する」
 * T-12: 受け入れ基準「delegations.create の fromUserId 制限が MCP ツール経路で機能することを検証する」
 *
 * behavioral test（実行検証）— usecase をモックし、ツールを実際に実行して認可を検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Request as ApprovalRequest } from "@/domain/models/request";
import type { ApprovalDelegation } from "@/domain/models/approvalDelegation";

// ---- 状態 ----
const state = {
  approveRequestCalls: [] as unknown[],
  rejectRequestCalls: [] as unknown[],
  bulkApproveCalls: [] as unknown[],
  createDelegationCalls: [] as unknown[],
};

// ---- 定数 ----
const ORG_ID = "org-1";
const REQUEST_UUID = "550e8400-e29b-41d4-a716-446655440001";
const USER_MGR = "550e8400-e29b-41d4-a716-446655440010"; // 有効な UUID
const USER_ADMIN = "550e8400-e29b-41d4-a716-446655440011"; // 有効な UUID
const USER_OTHER = "550e8400-e29b-41d4-a716-446655440099"; // 有効な UUID（自分以外）
const TO_USER_UUID = "550e8400-e29b-41d4-a716-446655440098";

// ---- モックデータ ----
const mockRequest: ApprovalRequest = {
  id: REQUEST_UUID,
  title: "テスト申請",
  formData: {},
  templateId: "tmpl-1",
  status: "approved",
  organizationId: ORG_ID,
  creatorId: "creator-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 2,
  originType: "manual",
  originPolicyId: null,
  originTriggerAction: null,
  originTriggerEntityId: null,
};

const mockDelegation: ApprovalDelegation = {
  id: "delegation-1",
  fromUserId: USER_MGR,
  toUserId: "user-other",
  fromUserRole: "manager",
  organizationId: ORG_ID,
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-08-01"),
  isActive: true,
  createdAt: new Date("2026-07-01"),
};

// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as approveRequestModule from "@/application/usecases/approveRequest";
import * as rejectRequestModule from "@/application/usecases/rejectRequest";
import * as bulkApproveModule from "@/application/usecases/bulkApprove";
import * as createDelegationModule from "@/application/usecases/createDelegation";
import * as approvalDelegationRepositoryModule from "@/infrastructure/repositories/approvalDelegationRepository";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realApproveRequest = approveRequestModule.approveRequest;
const realRejectRequest = rejectRequestModule.rejectRequest;
const realBulkApprove = bulkApproveModule.bulkApprove;
const realCreateDelegation = createDelegationModule.createDelegation;
const realApprovalDelegationRepository = { ...approvalDelegationRepositoryModule };

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    approveReject: { limit: 30, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/approveRequest", () => ({
  approveRequest: async (input: unknown) => {
    state.approveRequestCalls.push(input);
    return { ok: true as const, request: mockRequest };
  },
}));

mock.module("@/application/usecases/rejectRequest", () => ({
  rejectRequest: async (input: unknown) => {
    state.rejectRequestCalls.push(input);
    return { ok: true as const, request: mockRequest };
  },
}));

mock.module("@/application/usecases/bulkApprove", () => ({
  bulkApprove: async (input: unknown) => {
    state.bulkApproveCalls.push(input);
    return { results: [{ requestId: REQUEST_UUID, success: true }] };
  },
}));

mock.module("@/application/usecases/createDelegation", () => ({
  createDelegation: async (input: unknown) => {
    state.createDelegationCalls.push(input);
    return { ok: true as const, delegation: mockDelegation };
  },
}));

// approvalDelegationRepository は delegations ツールの deactivate で使われるが、
// このテストでは create のみテストするため簡易モックで十分
mock.module("@/infrastructure/repositories/approvalDelegationRepository", () => ({
  findByOrganization: async () => [],
  findActiveByToUserId: async () => [],
  create: async () => mockDelegation,
  deactivate: async () => null,
  findOverlapping: async () => [],
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/approveRequest", () => ({
    approveRequest: realApproveRequest,
  }));
  mock.module("@/application/usecases/rejectRequest", () => ({
    rejectRequest: realRejectRequest,
  }));
  mock.module("@/application/usecases/bulkApprove", () => ({
    bulkApprove: realBulkApprove,
  }));
  mock.module("@/application/usecases/createDelegation", () => ({
    createDelegation: realCreateDelegation,
  }));
  mock.module("@/infrastructure/repositories/approvalDelegationRepository", () =>
    realApprovalDelegationRepository
  );
});

// モック設定後に import する
const { registerApprovalRequestsTools } = await import(
  "../../app/api/mcp/tools/approvalRequests"
);
const { registerDelegationsTools } = await import("../../app/api/mcp/tools/delegations");

// ---- ヘルパー ----
async function callApprovalRequestsTool(
  args: Record<string, unknown>,
  userId: string,
  role: string,
  organizationId = ORG_ID
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerApprovalRequestsTools(server);
  return callTool(server, "approval_requests", args, userId, role, organizationId);
}

async function callDelegationsTool(
  args: Record<string, unknown>,
  userId: string,
  role: string,
  organizationId = ORG_ID
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerDelegationsTools(server);
  return callTool(server, "delegations", args, userId, role, organizationId);
}

async function callTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  role: string,
  organizationId: string
): Promise<{ isError?: boolean; text: string }> {
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
  state.approveRequestCalls = [];
  state.rejectRequestCalls = [];
  state.bulkApproveCalls = [];
  state.createDelegationCalls = [];
});

// ============================================================
// T-08: 権限外ユーザーの承認・却下拒否テスト
// ============================================================
describe("T-08: approval_requests — 認可テスト", () => {
  describe("approve 認可", () => {
    it("member ロールで approve を呼ぶと isError=true で拒否され approveRequest usecase に到達しない", async () => {
      const result = await callApprovalRequestsTool(
        { operation: "approve", requestId: REQUEST_UUID },
        "user-member-1",
        "member"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      expect(state.approveRequestCalls).toHaveLength(0);
    });

    it("admin ロールで approve を呼ぶと approveRequest usecase に到達する", async () => {
      const result = await callApprovalRequestsTool(
        { operation: "approve", requestId: REQUEST_UUID },
        USER_ADMIN,
        "admin"
      );

      expect(result.isError).toBeUndefined();
      expect(state.approveRequestCalls).toHaveLength(1);
    });

    it("manager ロールで approve を呼ぶと approveRequest usecase に到達する", async () => {
      await callApprovalRequestsTool(
        { operation: "approve", requestId: REQUEST_UUID },
        USER_MGR,
        "manager"
      );

      expect(state.approveRequestCalls).toHaveLength(1);
    });

    it("finance ロールで approve を呼ぶと approveRequest usecase に到達する", async () => {
      await callApprovalRequestsTool(
        { operation: "approve", requestId: REQUEST_UUID },
        "user-finance-1",
        "finance"
      );

      expect(state.approveRequestCalls).toHaveLength(1);
    });
  });

  describe("reject 認可", () => {
    it("member ロールで reject を呼ぶと isError=true で拒否され rejectRequest usecase に到達しない", async () => {
      const result = await callApprovalRequestsTool(
        { operation: "reject", requestId: REQUEST_UUID },
        "user-member-1",
        "member"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      expect(state.rejectRequestCalls).toHaveLength(0);
    });

    it("finance ロールで reject を呼ぶと rejectRequest usecase に到達する", async () => {
      await callApprovalRequestsTool(
        { operation: "reject", requestId: REQUEST_UUID },
        "user-finance-1",
        "finance"
      );

      expect(state.rejectRequestCalls).toHaveLength(1);
    });
  });

  describe("bulk_approve 認可", () => {
    it("member ロールで bulk_approve を呼ぶと isError=true で拒否される", async () => {
      const result = await callApprovalRequestsTool(
        { operation: "bulk_approve", requestIds: [REQUEST_UUID] },
        "user-member-1",
        "member"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      expect(state.bulkApproveCalls).toHaveLength(0);
    });
  });
});

// ============================================================
// T-12: delegations.create の fromUserId 制限テスト
// ============================================================
describe("T-12: delegations.create — admin 以外の fromUserId 制限", () => {
  it("manager ロールで fromUserId が自分以外の場合 isError=true で拒否され usecase に到達しない", async () => {
    const result = await callDelegationsTool(
      {
        operation: "create",
        fromUserId: USER_OTHER, // 自分以外（USER_MGR != USER_OTHER）
        toUserId: TO_USER_UUID,
        startDate: "2026-07-01",
        endDate: "2026-08-01",
      },
      USER_MGR, // userId = USER_MGR
      "manager"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.createDelegationCalls).toHaveLength(0);
  });

  it("manager ロールで fromUserId が自分自身の場合 usecase に到達する", async () => {
    await callDelegationsTool(
      {
        operation: "create",
        fromUserId: USER_MGR, // 自分自身
        toUserId: TO_USER_UUID,
        startDate: "2026-07-01",
        endDate: "2026-08-01",
      },
      USER_MGR,
      "manager"
    );

    // usecase に到達する（usecase の戻り値に関わらず、到達したことを確認）
    expect(state.createDelegationCalls).toHaveLength(1);
    const callArgs = state.createDelegationCalls[0] as Record<string, unknown>;
    expect(callArgs.fromUserId).toBe(USER_MGR);
  });

  it("admin ロールで fromUserId が他人の場合も usecase に到達する（admin は制限なし）", async () => {
    const result = await callDelegationsTool(
      {
        operation: "create",
        fromUserId: USER_OTHER, // 他人（admin は制限なし）
        toUserId: TO_USER_UUID,
        startDate: "2026-07-01",
        endDate: "2026-08-01",
      },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.createDelegationCalls).toHaveLength(1);
  });
});
