/**
 * MCP audit_logs ツールの認可・テナント分離・フィルタ伝播テスト。
 *
 * behavioral test（実行検証）:
 * - mock.module で依存を差し替えてツールを実際に実行し、結果・拒否・usecase 呼び出し引数を assert する。
 * - ソース文字列照合は使用しない。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// ---- 状態 ----
const state = {
  listAuditLogsCalls: [] as unknown[],
};

// ---- 定数 ----
const ORG_1 = "org-00000001-0000-0000-0000-000000000001";
const ORG_2 = "org-00000002-0000-0000-0000-000000000002";
const USER_ADMIN = "user-admin-0000-0000-0000-000000000001";
const USER_MANAGER = "user-mgr-000-0000-0000-000000000002";
const USER_MEMBER = "user-member-000-0000-0000-000000000003";

// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as listAuditLogsModule from "@/application/usecases/listAuditLogs";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realListAuditLogs = listAuditLogsModule.listAuditLogs;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
    webhookManage: { limit: 10, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/listAuditLogs", () => ({
  listAuditLogs: async (input: unknown) => {
    state.listAuditLogsCalls.push(input);
    return [];
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/listAuditLogs", () => ({
    listAuditLogs: realListAuditLogs,
  }));
});

// モック設定後に import する
const { registerAuditLogsTools } = await import("../../app/api/mcp/tools/auditLogs");

// ---- ヘルパー ----
async function callAuditLogsTool(
  args: Record<string, unknown>,
  userId: string,
  organizationId: string,
  role: string
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerAuditLogsTools(server);
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
      params: { name: "audit_logs", arguments: args },
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
  state.listAuditLogsCalls = [];
});

// ============================================================
// 認可テスト
// ============================================================
describe("audit_logs ツール — 認可テスト", () => {
  it("member で search を呼ぶと isError: true で拒否される", async () => {
    const result = await callAuditLogsTool(
      { operation: "search" },
      USER_MEMBER,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.listAuditLogsCalls).toHaveLength(0);
  });

  it("manager で search を呼ぶと isError: true で拒否される（exportAuditLog は admin のみ）", async () => {
    const result = await callAuditLogsTool(
      { operation: "search" },
      USER_MANAGER,
      ORG_1,
      "manager"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.listAuditLogsCalls).toHaveLength(0);
  });

  it("admin で search を呼ぶと成功する", async () => {
    const result = await callAuditLogsTool(
      { operation: "search" },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.listAuditLogsCalls).toHaveLength(1);
  });
});

// ============================================================
// テナント分離テスト
// ============================================================
describe("audit_logs ツール — テナント分離テスト", () => {
  it("org-1 で search を呼ぶと listAuditLogs に organizationId: org-1 が渡される", async () => {
    await callAuditLogsTool({ operation: "search" }, USER_ADMIN, ORG_1, "admin");

    expect(state.listAuditLogsCalls).toHaveLength(1);
    const callArgs = state.listAuditLogsCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_1);
  });

  it("org-2 で search を呼ぶと listAuditLogs に organizationId: org-2 が渡される", async () => {
    await callAuditLogsTool({ operation: "search" }, USER_ADMIN, ORG_2, "admin");

    expect(state.listAuditLogsCalls).toHaveLength(1);
    const callArgs = state.listAuditLogsCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_2);
  });

  it("org-1 と org-2 の 2 回の呼び出しで organizationId が混在しない", async () => {
    await callAuditLogsTool({ operation: "search" }, USER_ADMIN, ORG_1, "admin");
    await callAuditLogsTool({ operation: "search" }, USER_ADMIN, ORG_2, "admin");

    expect(state.listAuditLogsCalls).toHaveLength(2);
    const call1 = state.listAuditLogsCalls[0] as Record<string, unknown>;
    const call2 = state.listAuditLogsCalls[1] as Record<string, unknown>;
    expect(call1.organizationId).toBe(ORG_1);
    expect(call2.organizationId).toBe(ORG_2);
  });
});

// ============================================================
// フィルタ伝播テスト
// ============================================================
describe("audit_logs ツール — フィルタ伝播テスト", () => {
  it("targetType と limit フィルタが listAuditLogs の filters に正しく伝播される", async () => {
    await callAuditLogsTool(
      { operation: "search", targetType: "user", limit: 10 },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(state.listAuditLogsCalls).toHaveLength(1);
    const callArgs = state.listAuditLogsCalls[0] as Record<string, unknown>;
    const filters = callArgs.filters as Record<string, unknown>;
    expect(filters.targetType).toBe("user");
    expect(filters.limit).toBe(10);
  });

  it("startDate と endDate が Date オブジェクトに変換されて伝播される", async () => {
    const startDateIso = "2026-01-01T00:00:00.000Z";
    const endDateIso = "2026-06-30T23:59:59.000Z";

    await callAuditLogsTool(
      { operation: "search", startDate: startDateIso, endDate: endDateIso },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(state.listAuditLogsCalls).toHaveLength(1);
    const callArgs = state.listAuditLogsCalls[0] as Record<string, unknown>;
    const filters = callArgs.filters as Record<string, unknown>;
    expect(filters.startDate).toBeInstanceOf(Date);
    expect(filters.endDate).toBeInstanceOf(Date);
    expect((filters.startDate as Date).toISOString()).toBe(startDateIso);
    expect((filters.endDate as Date).toISOString()).toBe(endDateIso);
  });

  it("action と actorId フィルタが正しく伝播される", async () => {
    const actorId = "550e8400-e29b-41d4-a716-446655440001";
    await callAuditLogsTool(
      { operation: "search", action: "user.create", actorId },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(state.listAuditLogsCalls).toHaveLength(1);
    const callArgs = state.listAuditLogsCalls[0] as Record<string, unknown>;
    const filters = callArgs.filters as Record<string, unknown>;
    expect(filters.action).toBe("user.create");
    expect(filters.actorId).toBe(actorId);
  });
});
