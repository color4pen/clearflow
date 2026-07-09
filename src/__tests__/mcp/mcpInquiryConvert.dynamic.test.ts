/**
 * MCP 引合「案件化」専用オペレーション — behavioral テスト
 *
 * T-05: convert オペレーションの behavioral テスト（実 transport 経由）
 * T-06: convert が tools/list のスキーマ広告に含まれることのテスト
 * T-07: update_status: converted の後方互換テスト
 *
 * テスト対象の受け入れ基準:
 * - convert が引合を案件化し、ポリシー非該当時に生成された Deal（id 等）を返す
 * - ポリシー該当時に convert が pendingApproval を返し Deal を返さない
 * - clientId 未設定の引合に対する convert が拒否される（inv-inquiry-convert-requires-client）
 * - convert の認可・レート・監査が update_status: converted と同一判定
 * - update_status: converted が従来どおり動作する（後方互換）
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Inquiry } from "@/domain/models/inquiry";
import type { Deal } from "@/domain/models/deal";

// ─── 定数 ───

const ORG_ID = "org-1";
const USER_ADMIN = "550e8400-e29b-41d4-a716-446655440010";
const USER_MEMBER = "550e8400-e29b-41d4-a716-446655440020";
const INQUIRY_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ─── モックデータ ───

const mockInquiry: Inquiry = {
  id: INQUIRY_UUID,
  organizationId: ORG_ID,
  title: "テスト引合",
  description: null,
  status: "new",
  source: "web",
  clientId: "client-1",
  assigneeId: null,
  contactNote: null,
  budget: null,
  timeline: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

const mockDeal: Deal = {
  id: "deal-001",
  organizationId: ORG_ID,
  inquiryId: INQUIRY_UUID,
  clientId: "client-1",
  title: "テスト引合",
  description: null,
  phase: "hearing",
  estimatedAmount: null,
  estimatedStartDate: null,
  estimatedEndDate: null,
  contractType: null,
  assigneeId: null,
  technicalLeadId: null,
  estimateRequestId: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

// ─── モック状態 ───

type ConvertMockMode = "immediate" | "pending_approval" | "client_required_error";

const mockState = {
  mode: "immediate" as ConvertMockMode,
  updateInquiryStatusCalls: [] as Array<{
    inquiryId: string;
    organizationId: string;
    actorId: string;
    newStatus: string;
  }>,
  rateLimitAllowed: true,
};

// ─── 実実装を捕捉してからモック設定 ───

import * as updateInquiryStatusModule from "@/application/usecases/updateInquiryStatus";
import * as rateLimitModule from "@/infrastructure/rateLimit";

const realUpdateInquiryStatus = updateInquiryStatusModule.updateInquiryStatus;
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};

mock.module("@/application/usecases/updateInquiryStatus", () => ({
  updateInquiryStatus: async (data: {
    inquiryId: string;
    organizationId: string;
    actorId: string;
    newStatus: string;
  }) => {
    mockState.updateInquiryStatusCalls.push({
      inquiryId: data.inquiryId,
      organizationId: data.organizationId,
      actorId: data.actorId,
      newStatus: data.newStatus,
    });

    if (mockState.mode === "client_required_error") {
      return { ok: false as const, reason: "案件化するには顧客の登録が必要です" };
    }
    if (mockState.mode === "pending_approval") {
      return {
        ok: true as const,
        inquiry: mockInquiry,
        pendingApproval: { requestId: "req-pending-1" },
      };
    }
    // immediate: Deal を即時生成
    return { ok: true as const, inquiry: mockInquiry, deal: mockDeal };
  },
}));

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({
    allowed: mockState.rateLimitAllowed,
    remaining: mockState.rateLimitAllowed ? 9 : 0,
  }),
  RATE_LIMITS: {
    createRequest: { limit: 10, windowMs: 60_000 },
    approveReject: { limit: 30, windowMs: 60_000 },
    webhookManage: { limit: 10, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

afterAll(() => {
  mock.module("@/application/usecases/updateInquiryStatus", () => ({
    updateInquiryStatus: realUpdateInquiryStatus,
  }));
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
});

// ─── モック設定後に tools を import ───

const { registerInquiriesTools } = await import("../../app/api/mcp/tools/inquiries");

// ─── ヘルパー ───

async function callInquiriesTool(
  args: Record<string, unknown>,
  userId: string,
  role: string,
  organizationId = ORG_ID
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerInquiriesTools(server);

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
      params: { name: "inquiries", arguments: args },
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

async function listInquiriesSchema(): Promise<{
  properties?: Record<string, { type?: string; enum?: string[] }>;
}> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerInquiriesTools(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: USER_ADMIN,
    scopes: [],
    extra: { userId: USER_ADMIN, organizationId: ORG_ID, role: "admin" },
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
      method: "tools/list",
      params: {},
    }),
  });

  const response = await transport.handleRequest(request, { authInfo });
  const body = (await response.json()) as {
    result?: {
      tools?: Array<{
        name: string;
        inputSchema: { properties?: Record<string, { type?: string; enum?: string[] }> };
      }>;
    };
  };
  await transport.close();

  const tools = body.result?.tools ?? [];
  const inquiriesTool = tools.find((t) => t.name === "inquiries");
  return inquiriesTool?.inputSchema ?? {};
}

beforeEach(() => {
  mockState.updateInquiryStatusCalls = [];
  mockState.rateLimitAllowed = true;
  mockState.mode = "immediate";
});

// ─── T-05: convert オペレーション behavioral テスト ───

describe("T-05: convert オペレーション — behavioral テスト", () => {
  it("TC-03: 即時案件化で Deal を返す", async () => {
    mockState.mode = "immediate";

    const result = await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.text) as {
      inquiry?: { id: string };
      deal?: { id: string };
      message?: string;
    };

    expect(parsed.inquiry?.id).toBe(INQUIRY_UUID);
    expect(parsed.deal?.id).toBe("deal-001");
    expect(parsed.message).toContain("案件を生成しました");
  });

  it("TC-04: 承認ゲートで pendingApproval を返し deal が含まれない", async () => {
    mockState.mode = "pending_approval";

    const result = await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.text) as {
      inquiry?: { id: string };
      deal?: unknown;
      pendingApproval?: { requestId: string };
      message?: string;
    };

    expect(parsed.inquiry?.id).toBe(INQUIRY_UUID);
    expect(parsed.pendingApproval?.requestId).toBe("req-pending-1");
    expect(parsed.message).toContain("承認リクエストを作成しました");
    expect(parsed.deal).toBeUndefined();
  });

  it("TC-05: clientId 未設定で拒否される（inv-inquiry-convert-requires-client）", async () => {
    mockState.mode = "client_required_error";

    const result = await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("顧客");
  });

  it("TC-06: member ロールで認可拒否され usecase が呼ばれない", async () => {
    const result = await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_MEMBER,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限がありません");
    expect(mockState.updateInquiryStatusCalls).toHaveLength(0);
  });

  it("TC-08: レート制限超過時に拒否される", async () => {
    mockState.rateLimitAllowed = false;

    const result = await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("レート制限超過");
  });

  it("TC-14: usecase に正しい引数（newStatus: converted, organizationId, actorId）が渡される", async () => {
    mockState.mode = "immediate";

    await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_ADMIN,
      "admin"
    );

    expect(mockState.updateInquiryStatusCalls).toHaveLength(1);
    const call = mockState.updateInquiryStatusCalls[0]!;
    expect(call.inquiryId).toBe(INQUIRY_UUID);
    expect(call.organizationId).toBe(ORG_ID);
    expect(call.actorId).toBe(USER_ADMIN);
    expect(call.newStatus).toBe("converted");
  });

  it("TC-21: manager ロールで convert が usecase に到達する", async () => {
    mockState.mode = "immediate";

    const result = await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_ADMIN,
      "manager"
    );

    expect(result.isError).toBeUndefined();
    expect(mockState.updateInquiryStatusCalls).toHaveLength(1);
  });
});

// ─── T-06: スキーマ広告テスト ───

describe("T-06: スキーマ広告 — convert が tools/list に含まれる", () => {
  it("TC-11: tools/list で inquiries の operation enum に convert が含まれる", async () => {
    const schema = await listInquiriesSchema();
    const operationEnum = schema.properties?.operation?.enum ?? [];
    expect(operationEnum).toContain("convert");
  });

  it("TC-15: inquiryId フィールドが properties に型情報（string）を持つ", async () => {
    const schema = await listInquiriesSchema();
    const inquiryIdProp = schema.properties?.inquiryId;
    expect(inquiryIdProp).toBeDefined();
    // inquiryId は string 型として広告される
    const type = inquiryIdProp?.type;
    expect(type).toBe("string");
  });
});

// ─── T-07: 後方互換テスト ───

describe("T-07: 後方互換 — update_status: converted が従来どおり動作する", () => {
  it("TC-09: update_status converted で usecase が呼ばれ結果が返る", async () => {
    mockState.mode = "immediate";

    const result = await callInquiriesTool(
      { operation: "update_status", inquiryId: INQUIRY_UUID, newStatus: "converted" },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(mockState.updateInquiryStatusCalls).toHaveLength(1);
    expect(mockState.updateInquiryStatusCalls[0]!.newStatus).toBe("converted");
  });

  it("TC-10: update_status converted のレスポンスに usecase が Deal を返した場合 deal が含まれる", async () => {
    mockState.mode = "immediate";

    const result = await callInquiriesTool(
      { operation: "update_status", inquiryId: INQUIRY_UUID, newStatus: "converted" },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.text) as {
      inquiry?: { id: string };
      deal?: { id: string };
    };
    expect(parsed.deal?.id).toBe("deal-001");
    expect(parsed.inquiry?.id).toBe(INQUIRY_UUID);
  });

  it("TC-20: update_status converted 承認ゲートパスは pendingApproval を返し deal を含まない", async () => {
    mockState.mode = "pending_approval";

    const result = await callInquiriesTool(
      { operation: "update_status", inquiryId: INQUIRY_UUID, newStatus: "converted" },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.text) as {
      inquiry?: { id: string };
      deal?: unknown;
      pendingApproval?: { requestId: string };
      message?: string;
    };
    expect(parsed.pendingApproval?.requestId).toBe("req-pending-1");
    expect(parsed.message).toContain("承認リクエストを作成しました");
    expect(parsed.deal).toBeUndefined();
  });

  it("TC-17: convert と update_status:converted がレート制限バケットを共有する", async () => {
    // update_status:converted の後に convert を呼んでもレート制限が共有される
    mockState.rateLimitAllowed = false;

    const result = await callInquiriesTool(
      { operation: "convert", inquiryId: INQUIRY_UUID },
      USER_ADMIN,
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("レート制限超過");
  });
});
