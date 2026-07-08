/**
 * TC-001〜TC-020: MCP ツールの inputSchema 広告テスト
 *
 * buildAdvertisementSchema / validateAndParse の動作と、
 * tools/list で返される inputSchema の内容を検証する。
 */

import { describe, it, expect, mock, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";

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

// inquiries の usecase をモックして create 呼び出しを追跡する
import * as createInquiryModule from "@/application/usecases/createInquiry";
const realCreateInquiry = createInquiryModule.createInquiry;
let createInquiryCalled = false;
let createInquiryArgs: unknown = null;

mock.module("@/application/usecases/createInquiry", () => ({
  createInquiry: async (input: unknown) => {
    createInquiryCalled = true;
    createInquiryArgs = input;
    return { ok: true, inquiry: { id: "inq-001", title: "テスト" } };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createInquiry", () => ({
    createInquiry: realCreateInquiry,
  }));
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

const { buildAdvertisementSchema, validateAndParse } = await import("../../app/api/mcp/schemaHelpers");

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

type PropSchema = {
  type?: string;
  enum?: string[];
  description?: string;
  anyOf?: PropSchema[];
};

type ToolSchema = {
  type?: string;
  properties?: Record<string, PropSchema>;
};

/** nullable フィールドは anyOf になるため、type/enum を再帰的に解決するヘルパー */
function resolveType(prop: PropSchema | undefined): string | undefined {
  if (!prop) return undefined;
  if (prop.type) return prop.type;
  if (Array.isArray(prop.anyOf)) {
    return prop.anyOf.find((s) => s.type && s.type !== "null")?.type;
  }
  return undefined;
}

function resolveEnum(prop: PropSchema | undefined): string[] {
  if (!prop) return [];
  if (prop.enum) return prop.enum;
  if (Array.isArray(prop.anyOf)) {
    const found = prop.anyOf.find((s) => Array.isArray(s.enum));
    if (found?.enum) return found.enum;
  }
  return [];
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

/** tools/call を行い結果を返す */
async function callTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ isError?: boolean; content?: Array<{ text?: string }> }> {
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
      id: 2,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  const response = await transport.handleRequest(request, { authInfo: testAuthInfo });
  const body = (await response.json()) as {
    result?: { isError?: boolean; content?: Array<{ text?: string }> };
  };
  await transport.close();
  return body.result ?? {};
}

// ─── TC-001: 全 19 ツールの inputSchema.properties が空でない ───

describe("TC-001: 全 19 ツールの inputSchema.properties が空でない", () => {
  it("全ツールの inputSchema.properties は空オブジェクトでない", async () => {
    const schemas = await listToolSchemas();

    const toolNames = [
      "inquiries", "deals", "clients", "interactions", "tasks",
      "watches", "notifications", "contracts", "invoices", "revenue",
      "revenue_targets", "approval_requests", "delegations",
      "approval_templates", "approval_policies", "organization",
      "users", "webhooks", "audit_logs",
    ];

    expect(Object.keys(schemas)).toHaveLength(19);

    for (const name of toolNames) {
      const schema = schemas[name];
      expect(schema).toBeDefined();
      expect(schema.properties).toBeDefined();
      expect(Object.keys(schema.properties ?? {})).not.toHaveLength(0);
    }
  });
});

// ─── TC-002: operation プロパティが enum を持つ ───

describe("TC-002: operation プロパティが enum を持つ", () => {
  it("各ツールの operation に enum 配列が存在する", async () => {
    const schemas = await listToolSchemas();

    for (const [name, schema] of Object.entries(schemas)) {
      const operationProp = schema.properties?.operation;
      expect(operationProp, `${name}.properties.operation が存在しない`).toBeDefined();
      expect(
        Array.isArray(operationProp?.enum),
        `${name}.properties.operation.enum が配列でない`
      ).toBe(true);
      expect(
        (operationProp?.enum ?? []).length,
        `${name}.properties.operation.enum が空`
      ).toBeGreaterThan(0);
    }
  });
});

// ─── TC-003: inquiries の budget が integer 型で広告される ───

describe("TC-003: inquiries の budget が integer 型で広告される", () => {
  it("inputSchema.properties.budget の実効型が 'integer'", async () => {
    const schemas = await listToolSchemas();
    const budgetProp = schemas["inquiries"]?.properties?.budget;
    expect(budgetProp).toBeDefined();
    expect(resolveType(budgetProp)).toBe("integer");
  });
});

// ─── TC-004: inquiries の source が enum で広告される ───

describe("TC-004: inquiries の source が enum で広告される", () => {
  it("inputSchema.properties.source.enum に全ソース値が含まれる", async () => {
    const schemas = await listToolSchemas();
    const sourceProp = schemas["inquiries"]?.properties?.source;
    expect(sourceProp).toBeDefined();
    const enumValues = sourceProp?.enum ?? [];
    expect(enumValues).toContain("web");
    expect(enumValues).toContain("phone");
    expect(enumValues).toContain("email");
    expect(enumValues).toContain("referral");
    expect(enumValues).toContain("agent_service");
    expect(enumValues).toContain("exhibition");
    expect(enumValues).toContain("other");
  });
});

// ─── TC-005: create で title 欠落時にエラーを返す ───

describe("TC-005: create で title 欠落時にエラーを返す", () => {
  it("title 欠落の create 呼び出しが isError: true を返す", async () => {
    createInquiryCalled = false;
    const server = createFullServer();
    const result = await callTool(server, "inquiries", {
      operation: "create",
      source: "web",
      // title は意図的に省略
    });

    expect(result.isError).toBe(true);
    expect(createInquiryCalled).toBe(false);
  });
});

// ─── TC-006: budget に文字列を渡した場合にエラーを返す ───

describe("TC-006: budget に文字列を渡した場合にエラーを返す", () => {
  it("budget=文字列の場合に isError: true を返す", async () => {
    createInquiryCalled = false;
    const server = createFullServer();
    const result = await callTool(server, "inquiries", {
      operation: "create",
      title: "テスト",
      source: "web",
      budget: "高い",
    });

    expect(result.isError).toBe(true);
    expect(createInquiryCalled).toBe(false);
  });
});

// ─── TC-007: 正常な create 呼び出しが従来と同じ結果を返す ───

describe("TC-007: 正常な create 呼び出しが従来と同じ結果を返す", () => {
  it("正常な create 呼び出しが isError: false を返し usecase が呼ばれる", async () => {
    createInquiryCalled = false;
    createInquiryArgs = null;
    const server = createFullServer();
    const result = await callTool(server, "inquiries", {
      operation: "create",
      title: "テスト引き合い",
      source: "web",
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.isError).toBeUndefined();
    expect(createInquiryCalled).toBe(true);
    const args = createInquiryArgs as { title: string; source: string };
    expect(args?.title).toBe("テスト引き合い");
    expect(args?.source).toBe("web");
  });
});

// ─── TC-008: buildAdvertisementSchema が正しい z.object() を生成する ───

describe("TC-008: buildAdvertisementSchema が正しい z.object() を生成する", () => {
  it("inquiries の 5 operation スキーマから正しい広告スキーマを生成する", () => {
    const listSchema = z.object({ operation: z.literal("list") });
    const createSchema = z.object({
      operation: z.literal("create"),
      title: z.string().min(1),
      source: z.enum(["web", "email"]),
    });
    const updateSchema = z.object({
      operation: z.literal("update"),
      inquiryId: z.string().uuid(),
    });
    const updateStatusSchema = z.object({
      operation: z.literal("update_status"),
      inquiryId: z.string().uuid(),
      newStatus: z.enum(["new", "converted", "declined"]),
    });
    const deleteSchema = z.object({
      operation: z.literal("delete"),
      inquiryId: z.string().uuid(),
    });

    const adSchema = buildAdvertisementSchema([
      listSchema,
      createSchema,
      updateSchema,
      updateStatusSchema,
      deleteSchema,
    ]);

    // ZodObject であることを確認
    expect(adSchema).toBeInstanceOf(z.ZodObject);

    // operation が enum であることを確認
    const opField = adSchema.shape.operation;
    expect(opField).toBeInstanceOf(z.ZodEnum);

    // 全 operation 値が含まれていることを確認
    const enumValues = (opField as z.ZodEnum<[string, ...string[]]>).options;
    expect(enumValues).toContain("list");
    expect(enumValues).toContain("create");
    expect(enumValues).toContain("update");
    expect(enumValues).toContain("update_status");
    expect(enumValues).toContain("delete");
    expect(enumValues).toHaveLength(5);
  });
});

// ─── TC-009: buildAdvertisementSchema の返却スキーマが SDK の normalizeObjectSchema を通過する ───

describe("TC-009: buildAdvertisementSchema の返却スキーマが SDK の normalizeObjectSchema を通過する", () => {
  it("normalizeObjectSchema で有効なスキーマが返る（空オブジェクトにフォールバックしない）", async () => {
    // 実際の tools/list レスポンスが非空 properties を持つことで間接的に検証する
    const schemas = await listToolSchemas();
    const inquiriesSchema = schemas["inquiries"];

    // properties が空でなければ normalizeObjectSchema が通過した証拠
    expect(Object.keys(inquiriesSchema.properties ?? {})).not.toHaveLength(0);
    expect(inquiriesSchema.type).toBe("object");
  });
});

// ─── TC-010: tools/list で登録されるツール数が 19 件である ───

describe("TC-010: tools/list で登録されるツール数が 19 件である", () => {
  it("tools/list のツール配列が 19 件", async () => {
    const schemas = await listToolSchemas();
    expect(Object.keys(schemas)).toHaveLength(19);
  });
});

// ─── TC-011: validateAndParse で不正引数を渡すとエラー結果が返る ───

describe("TC-011: validateAndParse で不正引数を渡すとエラー結果が返る", () => {
  it("title 欠落の create 引数で null でない結果（エラー）が返る", () => {
    const inquiriesInputSchema = z.discriminatedUnion("operation", [
      z.object({ operation: z.literal("list") }),
      z.object({
        operation: z.literal("create"),
        title: z.string().min(1, "件名は必須です"),
        source: z.enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]),
      }),
    ]);

    const result = validateAndParse(inquiriesInputSchema, { operation: "create" });
    expect(result).not.toBeNull();
    expect(result?.isError).toBe(true);
  });
});

// ─── TC-012: validateAndParse で正常引数を渡すと null が返る ───

describe("TC-012: validateAndParse で正常引数を渡すと null が返る", () => {
  it("全必須フィールドを含む正常な create 引数で null が返る", () => {
    const inquiriesInputSchema = z.discriminatedUnion("operation", [
      z.object({ operation: z.literal("list") }),
      z.object({
        operation: z.literal("create"),
        title: z.string().min(1, "件名は必須です"),
        source: z.enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]),
      }),
    ]);

    const result = validateAndParse(inquiriesInputSchema, {
      operation: "create",
      title: "テスト",
      source: "web",
    });
    expect(result).toBeNull();
  });
});

// ─── TC-013: deals の estimatedAmount が integer 型として広告される ───

describe("TC-013: deals の estimatedAmount が integer 型として広告される", () => {
  it("inputSchema.properties.estimatedAmount の実効型が 'integer'", async () => {
    const schemas = await listToolSchemas();
    const prop = schemas["deals"]?.properties?.estimatedAmount;
    expect(prop).toBeDefined();
    expect(resolveType(prop)).toBe("integer");
  });
});

// ─── TC-014: deals の contractType が enum として広告される ───

describe("TC-014: deals の contractType が enum として広告される", () => {
  it("inputSchema.properties.contractType に enum 値が含まれる", async () => {
    const schemas = await listToolSchemas();
    const prop = schemas["deals"]?.properties?.contractType;
    expect(prop).toBeDefined();
    const enumValues = resolveEnum(prop);
    expect(enumValues).toContain("quasi_delegation");
    expect(enumValues).toContain("fixed_price");
    expect(enumValues).toContain("ses");
  });
});

// ─── TC-015: single-operation ツール（audit_logs）の operation enum が 1 値のみ ───

describe("TC-015: audit_logs の operation enum が ['search'] のみ", () => {
  it("audit_logs の operation.enum === ['search']", async () => {
    const schemas = await listToolSchemas();
    const operationProp = schemas["audit_logs"]?.properties?.operation;
    expect(operationProp).toBeDefined();
    expect(operationProp?.enum).toEqual(["search"]);
  });
});

// ─── TC-016: operation フィールドに description が付与されている ───

describe("TC-016: operation フィールドに description が付与されている", () => {
  it("inquiries.operation に description が存在し空でない", async () => {
    const schemas = await listToolSchemas();
    const operationProp = schemas["inquiries"]?.properties?.operation;
    expect(operationProp?.description).toBeTruthy();
  });
});

// ─── TC-017: 認証情報がない呼び出しで従来通りのエラーが返る ───

describe("TC-017: 認証情報がない呼び出しで認証エラーが返る", () => {
  it("authInfo なしの呼び出しが isError: true を返す", async () => {
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
        id: 2,
        method: "tools/call",
        params: { name: "inquiries", arguments: { operation: "list" } },
      }),
    });

    // authInfo を渡さない
    const response = await transport.handleRequest(request, {});
    const body = (await response.json()) as {
      result?: { isError?: boolean; content?: Array<{ text?: string }> };
    };
    await transport.close();

    expect(body.result?.isError).toBe(true);
    const text = body.result?.content?.[0]?.text ?? "";
    expect(text).toContain("認証情報が取得できません");
  });
});

// ─── TC-018: 不明な operation を渡した場合にエラーが返る ───

describe("TC-018: 不明な operation を渡した場合にエラーが返る", () => {
  it("unknown_operation で isError: true を返す", async () => {
    createInquiryCalled = false;
    const server = createFullServer();
    const result = await callTool(server, "inquiries", {
      operation: "unknown_operation",
    });

    expect(result.isError).toBe(true);
    expect(createInquiryCalled).toBe(false);
  });
});

// ─── TC-019-deals: deals の newPhase enum に hearing と passed が含まれる ───

describe("TC-019-deals: deals の update_phase newPhase enum に hearing と passed が含まれる", () => {
  it("inputSchema.properties.newPhase.enum に hearing と passed が含まれる", async () => {
    const schemas = await listToolSchemas();
    const newPhaseProp = schemas["deals"]?.properties?.newPhase;
    expect(newPhaseProp).toBeDefined();
    const enumValues = resolveEnum(newPhaseProp);
    expect(enumValues).toContain("hearing");
    expect(enumValues).toContain("proposal_prep");
    expect(enumValues).toContain("proposed");
    expect(enumValues).toContain("negotiation");
    expect(enumValues).toContain("won");
    expect(enumValues).toContain("lost");
    expect(enumValues).toContain("passed");
    expect(enumValues).toHaveLength(7);
  });
});

// ─── TC-019: 全ツールの operation enum 値がスキーマと一致する ───

describe("TC-019: 全ツールの operation enum 値がスキーマと一致する", () => {
  const expectedOperations: Record<string, string[]> = {
    inquiries: ["list", "create", "update", "update_status", "delete"],
    deals: ["list", "get", "create", "update", "update_phase", "delete"],
    clients: [
      "list", "get", "create", "update",
      "add_contact", "update_contact", "delete_contact",
      "add_deal_contact", "remove_deal_contact",
    ],
    interactions: [
      "create_meeting", "update_meeting",
      "record_contract_adjustment", "record_invoice_adjustment",
    ],
    tasks: [
      "list", "create", "update", "update_status",
      "toggle", "delete", "search_link_targets",
    ],
    watches: ["watch", "unwatch"],
    notifications: ["list", "mark_as_read"],
    contracts: ["list", "get", "create", "update", "update_status", "delete"],
    invoices: ["list", "create", "update", "update_status"],
    revenue: ["dashboard", "details", "forecast"],
    revenue_targets: ["set", "update", "delete"],
    approval_requests: [
      "list", "get", "create", "submit", "approve",
      "reject", "bulk_approve", "resubmit",
    ],
    delegations: ["list", "create", "deactivate"],
    approval_templates: ["list", "create", "update", "delete"],
    approval_policies: ["list", "create", "update", "toggle"],
    organization: ["get", "update"],
    users: ["list", "create", "update_role", "deactivate", "reactivate"],
    webhooks: ["list", "create", "delete", "toggle", "list_deliveries", "retry_delivery"],
    audit_logs: ["search"],
  };

  it("全ツールの operation enum が期待値と一致する", async () => {
    const schemas = await listToolSchemas();

    for (const [toolName, expectedOps] of Object.entries(expectedOperations)) {
      const schema = schemas[toolName];
      expect(schema, `${toolName} が tools/list に存在しない`).toBeDefined();

      const actualEnum = schema?.properties?.operation?.enum ?? [];
      const actualSet = new Set(actualEnum);
      const expectedSet = new Set(expectedOps);

      for (const op of expectedOps) {
        expect(actualSet.has(op), `${toolName}: operation enum に "${op}" が含まれていない`).toBe(true);
      }
      for (const op of actualEnum) {
        expect(expectedSet.has(op), `${toolName}: operation enum に予期しない "${op}" が含まれている`).toBe(true);
      }
    }
  });
});

// ─── TC-020: 不正引数のエラー応答に内部詳細が含まれない ───

describe("TC-020: 不正引数のエラー応答に内部詳細が含まれない", () => {
  it("エラーメッセージにスタックトレース・SQL が含まれない", async () => {
    const server = createFullServer();
    const result = await callTool(server, "inquiries", {
      operation: "create",
      // title 欠落
      source: "web",
    });

    expect(result.isError).toBe(true);
    const text = result.content?.[0]?.text ?? "";

    // 内部詳細が含まれないことを確認
    expect(text).not.toMatch(/Error:/);
    expect(text).not.toMatch(/at .+:\d+:\d+/); // スタックトレース
    expect(text).not.toMatch(/SELECT|INSERT|UPDATE|DELETE/i); // SQL
    expect(text).not.toMatch(/ZodError/);
  });
});
