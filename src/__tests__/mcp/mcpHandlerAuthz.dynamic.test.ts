/**
 * MCP ツールハンドラの認可 runtime テスト。
 * canPerform による拒否がツール実行時に実際に効くことを検証する。
 * （canPerform 単体の行列テストとは別に、ハンドラ経路での拒否を固定する。）
 *
 * deal.delete は admin のみ。member トークンで delete を呼ぶと、usecase に到達せず
 * isError で拒否されることを実行検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const authzMockState = {
  deleteDealCalls: [] as string[],
};

// バレル（@/application/usecases）ではなく個別ファイルをモックする。
// バレルをモックすると全 re-export が置き換わり、他テストが import する
// route → tools の barrel 依存（listInquiries 等）を truncate してしまう。
// 実装を捕捉して afterAll で復元し、モック汚染を防ぐ。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as deleteDealModule from "@/application/usecases/deleteDeal";
const realRateLimit = { checkRateLimit: rateLimitModule.checkRateLimit, RATE_LIMITS: rateLimitModule.RATE_LIMITS };
const realDeleteDeal = deleteDealModule.deleteDeal;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: { createRequest: { limit: 100, windowMs: 60_000 } },
}));

mock.module("@/application/usecases/deleteDeal", () => ({
  deleteDeal: async (input: { id: string }) => {
    authzMockState.deleteDealCalls.push(input.id);
    return { ok: true as const };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/deleteDeal", () => ({ deleteDeal: realDeleteDeal }));
});

const { registerDealsTools } = await import("../../app/api/mcp/tools/deals");

async function callDelete(role: string): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerDealsTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: "user-1",
    scopes: [],
    extra: { userId: "user-1", organizationId: "org-1", role },
  };
  const request = new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "deals",
        arguments: { operation: "delete", dealId: "123e4567-e89b-12d3-a456-426614174000" },
      },
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
  authzMockState.deleteDealCalls = [];
});

describe("MCP ハンドラ認可（deal.delete は admin のみ）", () => {
  it("member は delete を拒否され、usecase に到達しない", async () => {
    const result = await callDelete("member");
    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(authzMockState.deleteDealCalls).toHaveLength(0);
  });

  it("admin は delete が usecase に到達する", async () => {
    const result = await callDelete("admin");
    expect(result.isError).toBeUndefined();
    expect(authzMockState.deleteDealCalls).toEqual(["123e4567-e89b-12d3-a456-426614174000"]);
  });
});
