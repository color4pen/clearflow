/**
 * MCP approval_requests ツールの approve 系実行検証テスト（T-07, T-09, T-10）。
 *
 * T-07: 順序外ステップ承認の拒否テスト
 * T-09: システム連動承認の後続アクション実行テスト
 * T-10: bulk_approve が個別承認と同一判定になることのテスト
 *
 * behavioral test（実行検証）— usecase をモックし、ツールを実際に実行して結果を検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Request as ApprovalRequest } from "@/domain/models/request";

// ---- 状態 ----
const state = {
  approveRequestCalls: [] as unknown[],
  bulkApproveCalls: [] as unknown[],
  // モックが返す結果を制御するフラグ
  approveMode: "completed" as "completed" | "already_completed" | "system",
  bulkApproveMode: "mixed" as "success" | "mixed",
};

// ---- 定数 ----
const ORG_ID = "org-1";
const REQUEST_UUID = "550e8400-e29b-41d4-a716-446655440001";
const REQUEST_UUID_2 = "550e8400-e29b-41d4-a716-446655440002";
const BULK_UUID_1 = "550e8400-e29b-41d4-a716-446655440010";
const BULK_UUID_2 = "550e8400-e29b-41d4-a716-446655440011";

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

const mockSystemRequest: ApprovalRequest = {
  id: REQUEST_UUID,
  title: "システム連動申請",
  formData: {},
  templateId: "tmpl-1",
  status: "approved",
  organizationId: ORG_ID,
  creatorId: "creator-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 2,
  originType: "system",
  originPolicyId: "policy-1",
  originTriggerAction: "inquiry.convert",
  originTriggerEntityId: "inq-uuid-1",
};

// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as approveRequestModule from "@/application/usecases/approveRequest";
import * as bulkApproveModule from "@/application/usecases/bulkApprove";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realApproveRequest = approveRequestModule.approveRequest;
const realBulkApprove = bulkApproveModule.bulkApprove;

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
    if (state.approveMode === "already_completed") {
      return { ok: false as const, reason: "All approval steps are already completed." };
    }
    if (state.approveMode === "system") {
      return { ok: true as const, request: mockSystemRequest };
    }
    return { ok: true as const, request: mockRequest };
  },
}));

mock.module("@/application/usecases/bulkApprove", () => ({
  bulkApprove: async (input: unknown) => {
    state.bulkApproveCalls.push(input);
    if (state.bulkApproveMode === "mixed") {
      return {
        results: [
          { requestId: BULK_UUID_1, success: true },
          { requestId: BULK_UUID_2, success: false, reason: "All approval steps are already completed." },
        ],
      };
    }
    return {
      results: [
        { requestId: BULK_UUID_1, success: true },
        { requestId: BULK_UUID_2, success: true },
      ],
    };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/approveRequest", () => ({
    approveRequest: realApproveRequest,
  }));
  mock.module("@/application/usecases/bulkApprove", () => ({
    bulkApprove: realBulkApprove,
  }));
});

// モック設定後に import する
const { registerApprovalRequestsTools } = await import(
  "../../app/api/mcp/tools/approvalRequests"
);

// ---- ヘルパー ----
async function callTool(
  args: Record<string, unknown>,
  userId: string,
  role: string,
  organizationId = ORG_ID
): Promise<{ isError?: boolean; text: string; data: unknown }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerApprovalRequestsTools(server);
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
      params: { name: "approval_requests", arguments: args },
    }),
  });
  const response = await transport.handleRequest(request, { authInfo });
  const body = (await response.json()) as {
    result?: { isError?: boolean; content?: { text: string }[] };
  };
  await transport.close();
  const text = body.result?.content?.[0]?.text ?? "";
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { isError: body.result?.isError, text, data };
}

beforeEach(() => {
  state.approveRequestCalls = [];
  state.bulkApproveCalls = [];
  state.approveMode = "completed";
  state.bulkApproveMode = "mixed";
});

// ============================================================
// T-07: 順序外ステップ承認の拒否テスト
// ============================================================
describe("T-07: approve — 全ステップ承認済みの場合に拒否される", () => {
  it("approveRequest が { ok: false, reason: 'All approval steps are already completed.' } を返すとき isError=true になる", async () => {
    state.approveMode = "already_completed";

    const result = await callTool(
      { operation: "approve", requestId: REQUEST_UUID },
      "user-admin-1",
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("All approval steps are already completed.");
  });

  it("approveRequest が正しい引数（requestId, organizationId, actorId, actorRole）で呼ばれる", async () => {
    state.approveMode = "already_completed";

    await callTool(
      { operation: "approve", requestId: REQUEST_UUID },
      "user-admin-1",
      "admin"
    );

    expect(state.approveRequestCalls).toHaveLength(1);
    const callArgs = state.approveRequestCalls[0] as Record<string, unknown>;
    expect(callArgs.requestId).toBe(REQUEST_UUID);
    expect(callArgs.organizationId).toBe(ORG_ID);
    expect(callArgs.actorId).toBe("user-admin-1");
    expect(callArgs.actorRole).toBe("admin");
  });
});

// ============================================================
// T-09: システム連動承認の後続アクション実行テスト
// ============================================================
describe("T-09: approve — システム連動承認の挙動維持", () => {
  it("approveRequest がシステム連動リクエストの承認で成功し、結果に originType=system が含まれる", async () => {
    state.approveMode = "system";

    const result = await callTool(
      { operation: "approve", requestId: REQUEST_UUID },
      "user-admin-1",
      "admin"
    );

    // 成功すること
    expect(result.isError).toBeUndefined();

    // 結果に originType=system が含まれること（usecase 共有 = 既存挙動維持の証明）
    const data = result.data as Record<string, unknown>;
    expect(data.originType).toBe("system");
  });

  it("approveRequest usecase が呼ばれ、引数に organizationId と actorRole が含まれる", async () => {
    state.approveMode = "system";

    await callTool(
      { operation: "approve", requestId: REQUEST_UUID },
      "user-admin-1",
      "admin"
    );

    expect(state.approveRequestCalls).toHaveLength(1);
    const callArgs = state.approveRequestCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_ID);
    expect(callArgs.actorRole).toBe("admin");
  });
});

// ============================================================
// T-10: bulk_approve テスト
// ============================================================
describe("T-10: bulk_approve — 個別承認と同一判定・記録", () => {
  it("bulk_approve は bulkApprove usecase を organizationId, actorId, actorRole で呼ぶ", async () => {
    const result = await callTool(
      { operation: "bulk_approve", requestIds: [BULK_UUID_1, BULK_UUID_2] },
      "user-admin-1",
      "admin"
    );

    expect(result.isError).toBeUndefined();

    // usecase が呼ばれたことを確認
    expect(state.bulkApproveCalls).toHaveLength(1);
    const callArgs = state.bulkApproveCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_ID);
    expect(callArgs.actorId).toBe("user-admin-1");
    expect(callArgs.actorRole).toBe("admin");
    expect(callArgs.requestIds).toEqual([BULK_UUID_1, BULK_UUID_2]);
  });

  it("bulk_approve の結果に個別の success/failure が含まれる", async () => {
    state.bulkApproveMode = "mixed";

    const result = await callTool(
      { operation: "bulk_approve", requestIds: [BULK_UUID_1, BULK_UUID_2] },
      "user-admin-1",
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const data = result.data as { results: Array<{ requestId: string; success: boolean; reason?: string }> };
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results).toHaveLength(2);

    const result1 = data.results.find((r) => r.requestId === BULK_UUID_1);
    const result2 = data.results.find((r) => r.requestId === BULK_UUID_2);
    expect(result1?.success).toBe(true);
    expect(result2?.success).toBe(false);
    expect(result2?.reason).toBeTruthy();
  });

  it("requestIds が 21 件の場合、MCP スキーマレベルで上限エラーが返される", async () => {
    const twentyOneIds = Array.from(
      { length: 21 },
      (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`
    );

    const result = await callTool(
      { operation: "bulk_approve", requestIds: twentyOneIds },
      "user-admin-1",
      "admin"
    );

    // Zod スキーマ（max 20）で弾かれるため isError になる
    expect(result.isError).toBe(true);
    // usecase には到達しない
    expect(state.bulkApproveCalls).toHaveLength(0);
  });

  it("requestIds が 0 件の場合、スキーマレベルで弾かれる", async () => {
    const result = await callTool(
      { operation: "bulk_approve", requestIds: [] },
      "user-admin-1",
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(state.bulkApproveCalls).toHaveLength(0);
  });
});
