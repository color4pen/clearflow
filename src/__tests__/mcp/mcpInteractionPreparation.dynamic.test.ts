/**
 * MCP interactions ツール — preparation フィールド behavioral テスト。
 *
 * TA-01: create_meeting に preparation を指定した呼び出しで usecase に preparation が渡る。
 * TA-02: update_meeting で preparation を省略した呼び出しで usecase に preparation: undefined が渡る（部分更新: 既存値保持）。
 * TA-03: update_meeting で preparation: null を指定した呼び出しで usecase に preparation: null が渡る（クリア）。
 * TA-04: tools/list の interactions ツールの inputSchema.properties.preparation.description に
 *         「事前準備」と「Markdown」が含まれる。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// ---------------------------------------------------------------------------
// 共有状態
// ---------------------------------------------------------------------------

const state = {
  createMeetingCalls: [] as unknown[],
  updateMeetingCalls: [] as unknown[],
};

// ---------------------------------------------------------------------------
// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
// ---------------------------------------------------------------------------

import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createMeetingModule from "@/application/usecases/createMeeting";
import * as updateMeetingModule from "@/application/usecases/updateMeeting";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateMeeting = createMeetingModule.createMeeting;
const realUpdateMeeting = updateMeetingModule.updateMeeting;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

const MOCK_MEETING = {
  id: "meeting-1",
  organizationId: "org-1",
  kind: "meeting",
  dealId: "123e4567-e89b-12d3-a456-426614174001",
  inquiryId: null,
  contractId: null,
  invoiceId: null,
  clientId: null,
  meetingType: "hearing",
  date: new Date("2026-01-01"),
  location: null,
  attendees: [],
  summary: null,
  preparation: "事前準備メモ",
  actionItems: [],
  details: null,
  createdById: "user-A",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

mock.module("@/application/usecases/createMeeting", () => ({
  createMeeting: async (input: unknown) => {
    state.createMeetingCalls.push(input);
    return { ok: true as const, meeting: MOCK_MEETING };
  },
}));

mock.module("@/application/usecases/updateMeeting", () => ({
  updateMeeting: async (input: unknown) => {
    state.updateMeetingCalls.push(input);
    return { ok: true as const, meeting: MOCK_MEETING };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createMeeting", () => ({
    createMeeting: realCreateMeeting,
  }));
  mock.module("@/application/usecases/updateMeeting", () => ({
    updateMeeting: realUpdateMeeting,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");

// ---------------------------------------------------------------------------
// UUID 定数
// ---------------------------------------------------------------------------

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const MEETING_UUID = "123e4567-e89b-12d3-a456-426614174002";

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

async function callInteractions(
  args: Record<string, unknown>,
  role = "admin"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerInteractionsTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: "user-A",
    scopes: [],
    extra: { userId: "user-A", organizationId: "org-1", role },
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
      params: { name: "interactions", arguments: args },
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

async function listToolSchemas(): Promise<Record<string, { type?: string; properties?: Record<string, { description?: string; anyOf?: { description?: string }[] }> }>> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerInteractionsTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: "user-A",
    scopes: [],
    extra: { userId: "user-A", organizationId: "org-1", role: "admin" },
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
    result?: { tools?: Array<{ name: string; inputSchema: { type?: string; properties?: Record<string, { description?: string; anyOf?: { description?: string }[] }> } }> };
  };
  await transport.close();
  const tools = body.result?.tools ?? [];
  const schemaMap: Record<string, { type?: string; properties?: Record<string, { description?: string; anyOf?: { description?: string }[] }> }> = {};
  for (const tool of tools) {
    schemaMap[tool.name] = tool.inputSchema;
  }
  return schemaMap;
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.createMeetingCalls = [];
  state.updateMeetingCalls = [];
});

// ===========================================================================
// TA-01: create_meeting に preparation を指定したとき usecase に渡る
// ===========================================================================

describe("TA-01: create_meeting — preparation が usecase に渡る", () => {
  it("preparation を指定した create_meeting 呼び出しで usecase に preparation が渡る", async () => {
    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
      preparation: "顧客の課題を確認する",
    });

    expect(result.isError).toBeUndefined();
    expect(state.createMeetingCalls).toHaveLength(1);
    const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.preparation).toBe("顧客の課題を確認する");
  });

  it("preparation を省略した create_meeting 呼び出しで usecase に preparation: null が渡る", async () => {
    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
      // preparation は省略
    });

    expect(result.isError).toBeUndefined();
    expect(state.createMeetingCalls).toHaveLength(1);
    const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.preparation).toBeNull();
  });
});

// ===========================================================================
// TA-02: update_meeting で preparation を省略したとき usecase に undefined が渡る（部分更新）
// ===========================================================================

describe("TA-02: update_meeting — preparation 省略で usecase に undefined が渡る（既存値保持）", () => {
  it("preparation を省略した update_meeting 呼び出しで usecase に preparation: undefined が渡る", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      summary: "更新後のサマリ",
      // preparation は省略
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.preparation).toBeUndefined();
    expect(callArgs.summary).toBe("更新後のサマリ");
  });
});

// ===========================================================================
// TA-03: update_meeting で preparation: null を指定したとき usecase に null が渡る（クリア）
// ===========================================================================

describe("TA-03: update_meeting — preparation: null で usecase に null が渡る（クリア）", () => {
  it("preparation: null を指定した update_meeting 呼び出しで usecase に preparation: null が渡る", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      preparation: null,
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.preparation).toBeNull();
    // summary は省略なので undefined（変更なし）
    expect(callArgs.summary).toBeUndefined();
  });
});

// ===========================================================================
// TA-04: MCP inputSchema 広告テスト
// ===========================================================================

describe("TA-04: interactions inputSchema の preparation 広告テスト", () => {
  it("tools/list の interactions の inputSchema.properties.preparation の description に「事前準備」と「Markdown」が含まれる", async () => {
    const schemas = await listToolSchemas();
    const interactionsSchema = schemas["interactions"];
    expect(interactionsSchema).toBeDefined();

    const preparationProp = interactionsSchema.properties?.preparation;
    expect(preparationProp).toBeDefined();

    // nullable フィールドは anyOf になる場合があるため、description を解決する
    const description =
      preparationProp?.description ??
      preparationProp?.anyOf?.find((s) => s.description)?.description ??
      "";

    expect(description).toContain("事前準備");
    expect(description).toContain("Markdown");
  });
});
