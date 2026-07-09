/**
 * TC-FC-01〜TC-FC-08: MCP フィールドの用途・形式 describe 契約テスト
 *
 * tools/list 経由で取得した inputSchema のフィールド description を assert することで、
 * Markdown 対応フィールドおよび用途不明フィールドの describe 品質を固定する。
 * ソース文字列照合は使用しない（全て実行時検証）。
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

// ─── 型定義 ───

type PropSchema = {
  type?: string;
  enum?: string[];
  description?: string;
  anyOf?: PropSchema[];
  properties?: Record<string, PropSchema>;
};

type ToolSchema = {
  type?: string;
  properties?: Record<string, PropSchema>;
};

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

/** tools/list を呼び出して inputSchema マップを返す */
async function listToolSchemas(): Promise<Record<string, ToolSchema>> {
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
    result?: { tools?: Array<{ name: string; inputSchema: ToolSchema }> };
  };
  await transport.close();

  const tools = body.result?.tools ?? [];
  const schemaMap: Record<string, ToolSchema> = {};
  for (const tool of tools) {
    schemaMap[tool.name] = tool.inputSchema;
  }
  return schemaMap;
}

// ─── TC-FC-01: Markdown 対応フィールドの describe に「Markdown」を含む ───

describe("TC-FC-01: Markdown 対応フィールドの describe に「Markdown」を含む", () => {
  it("inquiries.description の description に「Markdown」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["inquiries"]?.properties?.description?.description;
    expect(desc, "inquiries.description の description が存在しない").toBeTruthy();
    expect(desc).toContain("Markdown");
  });

  it("inquiries.contactNote の description に「Markdown」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["inquiries"]?.properties?.contactNote?.description;
    expect(desc, "inquiries.contactNote の description が存在しない").toBeTruthy();
    expect(desc).toContain("Markdown");
  });

  it("deals.notes の description に「Markdown」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["deals"]?.properties?.notes?.description;
    expect(desc, "deals.notes の description が存在しない").toBeTruthy();
    expect(desc).toContain("Markdown");
  });

  it("interactions.summary の description に「Markdown」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["interactions"]?.properties?.summary?.description;
    expect(desc, "interactions.summary の description が存在しない").toBeTruthy();
    expect(desc).toContain("Markdown");
  });
});

// ─── TC-FC-02: Markdown 対応フィールドの describe に「改行」を含む ───

describe("TC-FC-02: Markdown 対応フィールドの describe に「改行」を含む", () => {
  it("inquiries.description の description に「改行」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["inquiries"]?.properties?.description?.description;
    expect(desc, "inquiries.description の description が存在しない").toBeTruthy();
    expect(desc).toContain("改行");
  });

  it("inquiries.contactNote の description に「改行」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["inquiries"]?.properties?.contactNote?.description;
    expect(desc, "inquiries.contactNote の description が存在しない").toBeTruthy();
    expect(desc).toContain("改行");
  });

  it("deals.notes の description に「改行」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["deals"]?.properties?.notes?.description;
    expect(desc, "deals.notes の description が存在しない").toBeTruthy();
    expect(desc).toContain("改行");
  });

  it("interactions.summary の description に「改行」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["interactions"]?.properties?.summary?.description;
    expect(desc, "interactions.summary の description が存在しない").toBeTruthy();
    expect(desc).toContain("改行");
  });
});

// ─── TC-FC-03: interactions.summary の describe が議事録用途を示す ───

describe("TC-FC-03: interactions.summary の describe が議事録用途を示す", () => {
  it("interactions.summary の description に「議事録」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["interactions"]?.properties?.summary?.description;
    expect(desc, "interactions.summary の description が存在しない").toBeTruthy();
    expect(desc).toContain("議事録");
  });
});

// ─── TC-FC-04: interactions.details の describe が補足用途を示す ───

describe("TC-FC-04: interactions.details の describe が補足用途を示す", () => {
  it("interactions.details の description に「補足」を含む", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["interactions"]?.properties?.details?.description;
    expect(desc, "interactions.details の description が存在しない").toBeTruthy();
    expect(desc).toContain("補足");
  });
});

// ─── TC-FC-05: deals.description の describe が存在する ───

describe("TC-FC-05: deals.description の describe が存在する", () => {
  it("deals.description の description が空でない文字列として設定されている", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["deals"]?.properties?.description?.description;
    expect(typeof desc).toBe("string");
    expect((desc ?? "").length).toBeGreaterThan(0);
  });
});

// ─── TC-FC-06: deals.notes の describe が存在する ───

describe("TC-FC-06: deals.notes の describe が存在する", () => {
  it("deals.notes の description が空でない文字列として設定されている", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["deals"]?.properties?.notes?.description;
    expect(typeof desc).toBe("string");
    expect((desc ?? "").length).toBeGreaterThan(0);
  });
});

// ─── TC-FC-07: inquiries.description の describe が存在する ───

describe("TC-FC-07: inquiries.description の describe が存在する", () => {
  it("inquiries.description の description が空でない文字列として設定されている", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["inquiries"]?.properties?.description?.description;
    expect(typeof desc).toBe("string");
    expect((desc ?? "").length).toBeGreaterThan(0);
  });
});

// ─── TC-FC-08: deals.description に「Markdown」を含まない（ネガティブ） ───

describe("TC-FC-08: deals.description の describe に「Markdown」を含まない", () => {
  it("deals.description は MarkdownTextarea 非対応のため description に「Markdown」を含まない", async () => {
    const schemas = await listToolSchemas();
    const desc = schemas["deals"]?.properties?.description?.description ?? "";
    expect(desc).not.toContain("Markdown");
  });
});

// ─── TC-013: hearingData.notes の describe が設定されている ───

describe("TC-013: hearingData.notes の describe が設定されている", () => {
  it("interactions.hearingData.properties.notes の description が空でない文字列として設定されている", async () => {
    const schemas = await listToolSchemas();
    const hearingDataProp = schemas["interactions"]?.properties?.hearingData;
    // hearingData は nullable で anyOf になる場合があるため、object スキーマを解決する
    let hearingDataObj: PropSchema | undefined = hearingDataProp;
    if (!hearingDataObj?.properties && Array.isArray(hearingDataObj?.anyOf)) {
      hearingDataObj = hearingDataObj.anyOf?.find(
        (s) => s.type === "object" && s.properties
      );
    }
    const noteDesc = hearingDataObj?.properties?.notes?.description;
    expect(noteDesc, "hearingData.notes の description が存在しない").toBeTruthy();
    expect((noteDesc ?? "").length).toBeGreaterThan(0);
  });
});
