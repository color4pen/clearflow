/**
 * MCP ツールの description 品質テスト
 *
 * tools/list で取得した description が distinct かつ各ツールに
 * 必要なキーワードを含むことを実行検証で固定する。
 */

import { describe, it, expect, mock, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// ─── モック設定（DB/Redis 接続を持つモジュールを先にモックする） ───

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
    approveReject: { limit: 50, windowMs: 60_000 },
    webhookManage: { limit: 20, windowMs: 60_000 },
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
});

// ─── モック設定後に register 関数を import ───

const { registerInquiriesTools } = await import("../../app/api/mcp/tools/inquiries");
const { registerDealsTools } = await import("../../app/api/mcp/tools/deals");
const { registerClientsTools } = await import("../../app/api/mcp/tools/clients");
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");
const { registerTasksTools } = await import("../../app/api/mcp/tools/tasks");
const { registerWatchesTools } = await import("../../app/api/mcp/tools/watches");
const { registerNotificationsTools } = await import("../../app/api/mcp/tools/notifications");
const { registerContractsTools } = await import("../../app/api/mcp/tools/contracts");
const { registerInvoicesTools } = await import("../../app/api/mcp/tools/invoices");
const { registerRevenueTools } = await import("../../app/api/mcp/tools/revenue");
const { registerRevenueTargetsTools } = await import("../../app/api/mcp/tools/revenueTargets");
const { registerApprovalRequestsTools } = await import("../../app/api/mcp/tools/approvalRequests");
const { registerDelegationsTools } = await import("../../app/api/mcp/tools/delegations");
const { registerApprovalTemplatesTools } = await import("../../app/api/mcp/tools/approvalTemplates");
const { registerApprovalPoliciesTools } = await import("../../app/api/mcp/tools/approvalPolicies");
const { registerOrganizationTools } = await import("../../app/api/mcp/tools/organization");
const { registerUsersTools } = await import("../../app/api/mcp/tools/users");
const { registerWebhooksTools } = await import("../../app/api/mcp/tools/webhooks");
const { registerAuditLogsTools } = await import("../../app/api/mcp/tools/auditLogs");

// ─── テスト用ヘルパー ───

const testAuthInfo: AuthInfo = {
  token: "cfp_test",
  clientId: "user-test",
  scopes: [],
  extra: { userId: "user-test", organizationId: "org-test", role: "admin" },
};

/** 全 19 ツールを登録した McpServer を作成する */
function createFullServer() {
  const server = new McpServer({ name: "clearflow", version: "1.0.0" });
  registerInquiriesTools(server);
  registerDealsTools(server);
  registerClientsTools(server);
  registerInteractionsTools(server);
  registerTasksTools(server);
  registerWatchesTools(server);
  registerNotificationsTools(server);
  registerContractsTools(server);
  registerInvoicesTools(server);
  registerRevenueTools(server);
  registerRevenueTargetsTools(server);
  registerApprovalRequestsTools(server);
  registerDelegationsTools(server);
  registerApprovalTemplatesTools(server);
  registerApprovalPoliciesTools(server);
  registerOrganizationTools(server);
  registerUsersTools(server);
  registerWebhooksTools(server);
  registerAuditLogsTools(server);
  return server;
}

/** tools/list を呼び出して { name → description } マップを返す */
async function listToolDescriptions(): Promise<Record<string, string>> {
  const server = createFullServer();
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
    result?: { tools?: Array<{ name: string; description: string }> };
  };
  await transport.close();

  const tools = body.result?.tools ?? [];
  const descMap: Record<string, string> = {};
  for (const tool of tools) {
    descMap[tool.name] = tool.description ?? "";
  }
  return descMap;
}

// ─── distinctness テスト: 全 19 ツールの description が重複しない ───

describe("distinctness: 全 19 ツールの description が相互に distinct である", () => {
  it("description の Set サイズが 19 である（重複なし）", async () => {
    const descMap = await listToolDescriptions();

    expect(Object.keys(descMap)).toHaveLength(19);

    const descriptions = Object.values(descMap);
    const uniqueDescriptions = new Set(descriptions);
    expect(uniqueDescriptions.size).toBe(19);
  });
});

// ─── keyword テスト: 各ツールの description に主要キーワードが含まれる ───

describe("keyword: 各ツールの description に主要キーワードが含まれる", () => {
  const keywordMap: Record<string, string> = {
    clients: "顧客",
    inquiries: "引合",
    deals: "案件",
    contracts: "契約",
    invoices: "請求",
    interactions: "顧客接点",
    tasks: "タスク",
    watches: "ウォッチ",
    notifications: "通知",
    revenue: "売上",
    revenue_targets: "売上目標",
    approval_requests: "承認",
    delegations: "委任",
    approval_templates: "テンプレート",
    approval_policies: "ポリシー",
    organization: "組織",
    users: "ユーザー",
    webhooks: "Webhook",
    audit_logs: "監査",
  };

  it("各ツールの description に主要キーワードが含まれる", async () => {
    const descMap = await listToolDescriptions();

    for (const [toolName, keyword] of Object.entries(keywordMap)) {
      const description = descMap[toolName];
      expect(description, `${toolName} が tools/list に存在しない`).toBeDefined();
      expect(
        description,
        `${toolName} の description に "${keyword}" が含まれていない（description: "${description}"）`
      ).toContain(keyword);
    }
  });
});

// ─── non-empty テスト: 全ツールの description が空でない ───

describe("non-empty: 全 19 ツールの description が空でない", () => {
  it("全ツールの description が空文字でない", async () => {
    const descMap = await listToolDescriptions();

    expect(Object.keys(descMap)).toHaveLength(19);

    for (const [toolName, description] of Object.entries(descMap)) {
      expect(description, `${toolName} の description が空`).toBeTruthy();
    }
  });
});
