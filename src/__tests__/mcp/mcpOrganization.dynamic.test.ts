/**
 * MCP organization ツールの認可・テナント分離・監査記録テスト。
 *
 * behavioral test（実行検証）:
 * - mock.module で依存を差し替えてツールを実際に実行し、結果・拒否・usecase 到達を assert する。
 * - ソース文字列照合は使用しない。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Organization } from "@/domain/models/organization";

// ---- 状態 ----
const state = {
  updateOrganizationCalls: [] as unknown[],
  findByIdCalls: [] as Array<{ id: string; organizationId: string }>,
  findByIdResult: null as Organization | null,
};

// ---- 定数 ----
const ORG_1 = "org-00000001-0000-0000-0000-000000000001";
const ORG_2 = "org-00000002-0000-0000-0000-000000000002";
const USER_ADMIN = "user-admin-0000-0000-0000-000000000001";
const USER_MEMBER = "user-member-000-0000-0000-000000000002";

const mockOrg1: Organization = {
  id: ORG_1,
  name: "テスト組織 1",
  createdAt: new Date("2026-01-01"),
};

// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as organizationRepositoryModule from "@/infrastructure/repositories/organizationRepository";
import * as updateOrganizationModule from "@/application/usecases/updateOrganization";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realOrganizationRepository = { ...organizationRepositoryModule };
const realUpdateOrganization = updateOrganizationModule.updateOrganization;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
    webhookManage: { limit: 10, windowMs: 60_000 },
  },
}));

mock.module("@/infrastructure/repositories/organizationRepository", () => ({
  findById: async (id: string, organizationId: string) => {
    state.findByIdCalls.push({ id, organizationId });
    return state.findByIdResult;
  },
  create: realOrganizationRepository.create,
  findAll: realOrganizationRepository.findAll,
  update: realOrganizationRepository.update,
}));

mock.module("@/application/usecases/updateOrganization", () => ({
  updateOrganization: async (input: unknown) => {
    state.updateOrganizationCalls.push(input);
    return { ok: true as const };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/infrastructure/repositories/organizationRepository", () =>
    realOrganizationRepository
  );
  mock.module("@/application/usecases/updateOrganization", () => ({
    updateOrganization: realUpdateOrganization,
  }));
});

// モック設定後に import する
const { registerOrganizationTools } = await import(
  "../../app/api/mcp/tools/organization"
);

// ---- ヘルパー ----
async function callOrganizationTool(
  args: Record<string, unknown>,
  userId: string,
  organizationId: string,
  role: string
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerOrganizationTools(server);
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
      params: { name: "organization", arguments: args },
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
  state.updateOrganizationCalls = [];
  state.findByIdCalls = [];
  state.findByIdResult = mockOrg1;
});

// ============================================================
// 認可テスト
// ============================================================
describe("organization ツール — 認可テスト", () => {
  it("admin で update を呼ぶと updateOrganization usecase に到達する", async () => {
    const result = await callOrganizationTool(
      { operation: "update", name: "新組織名" },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.updateOrganizationCalls).toHaveLength(1);
  });

  it("member で update を呼ぶと isError: true で拒否され usecase に到達しない", async () => {
    const result = await callOrganizationTool(
      { operation: "update", name: "新組織名" },
      USER_MEMBER,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.updateOrganizationCalls).toHaveLength(0);
  });

  it("member で get を呼ぶと成功する（get は全ロール許可）", async () => {
    const result = await callOrganizationTool(
      { operation: "get" },
      USER_MEMBER,
      ORG_1,
      "member"
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.text) as Organization;
    expect(data.id).toBe(ORG_1);
  });
});

// ============================================================
// テナント分離テスト
// ============================================================
describe("organization ツール — テナント分離テスト", () => {
  it("org-1 で get を呼ぶと organizationRepository.findById に org-1 が渡される", async () => {
    state.findByIdResult = { ...mockOrg1, id: ORG_1 };

    await callOrganizationTool({ operation: "get" }, USER_ADMIN, ORG_1, "admin");

    expect(state.findByIdCalls).toHaveLength(1);
    expect(state.findByIdCalls[0].id).toBe(ORG_1);
    expect(state.findByIdCalls[0].organizationId).toBe(ORG_1);
  });

  it("org-2 で get を呼ぶと organizationRepository.findById に org-2 が渡される", async () => {
    state.findByIdResult = { id: ORG_2, name: "テスト組織 2", createdAt: new Date() };

    await callOrganizationTool({ operation: "get" }, USER_ADMIN, ORG_2, "admin");

    expect(state.findByIdCalls).toHaveLength(1);
    expect(state.findByIdCalls[0].id).toBe(ORG_2);
    expect(state.findByIdCalls[0].organizationId).toBe(ORG_2);
  });
});

// ============================================================
// 監査記録テスト
// ============================================================
describe("organization ツール — 監査記録テスト", () => {
  it("update を呼ぶと updateOrganization usecase が organizationId と actorId を受け取る", async () => {
    await callOrganizationTool(
      { operation: "update", name: "更新後の名前" },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(state.updateOrganizationCalls).toHaveLength(1);
    const callArgs = state.updateOrganizationCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_1);
    expect(callArgs.actorId).toBe(USER_ADMIN);
    expect(callArgs.name).toBe("更新後の名前");
  });
});
