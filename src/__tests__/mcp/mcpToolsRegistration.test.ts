/**
 * TC-025: createMcpServer が既存 3 + 新規 4 = 7 ツールを登録する。
 *
 * McpServer に 7 つの register 関数を呼び出し、tools/list で登録ツール一覧を取得して
 * inquiries / deals / clients / interactions / tasks / watches / notifications の
 * 7 ツールが存在することを実行検証する。
 */

import { describe, it, expect, mock, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// rateLimit は DB/Redis 接続を持つため mock してから tool modules を import する
import * as rateLimitModule from "@/infrastructure/rateLimit";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
});

// モック設定後に register 関数を import する
const { registerInquiriesTools } = await import("../../app/api/mcp/tools/inquiries");
const { registerDealsTools } = await import("../../app/api/mcp/tools/deals");
const { registerClientsTools } = await import("../../app/api/mcp/tools/clients");
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");
const { registerTasksTools } = await import("../../app/api/mcp/tools/tasks");
const { registerWatchesTools } = await import("../../app/api/mcp/tools/watches");
const { registerNotificationsTools } = await import("../../app/api/mcp/tools/notifications");

const testAuthInfo: AuthInfo = {
  token: "cfp_test",
  clientId: "user-test",
  scopes: [],
  extra: { userId: "user-test", organizationId: "org-test", role: "admin" },
};

describe("TC-025: 7 ツールが登録される", () => {
  it("inquiries / deals / clients / interactions / tasks / watches / notifications の 7 ツールが登録されている", async () => {
    const server = new McpServer({ name: "clearflow", version: "1.0.0" });
    registerInquiriesTools(server);
    registerDealsTools(server);
    registerClientsTools(server);
    registerInteractionsTools(server);
    registerTasksTools(server);
    registerWatchesTools(server);
    registerNotificationsTools(server);

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);

    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    const response = await transport.handleRequest(request, { authInfo: testAuthInfo });
    const body = (await response.json()) as {
      result?: { tools?: Array<{ name: string }> };
    };
    await transport.close();

    const tools = body.result?.tools ?? [];
    const toolNames = tools.map((t) => t.name);

    // 7 ツールが登録されている
    expect(toolNames).toHaveLength(7);
    expect(toolNames).toContain("inquiries");
    expect(toolNames).toContain("deals");
    expect(toolNames).toContain("clients");
    expect(toolNames).toContain("interactions");
    expect(toolNames).toContain("tasks");
    expect(toolNames).toContain("watches");
    expect(toolNames).toContain("notifications");
  });
});
