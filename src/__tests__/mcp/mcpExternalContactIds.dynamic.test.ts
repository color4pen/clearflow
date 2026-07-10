/**
 * 社外参加者の顧客担当者参照化に関する behavioral テスト。
 *
 * 社外参加者の解決（contactId → 氏名スナップショット）は usecase 層の責務のため、
 * MCP ハンドラは「externalContactIds が usecase にそのまま渡ること」と
 * 「usecase の field 付きエラーが isError:true でそのまま返ること」を検証する。
 *
 * - MCP create_meeting で externalContactIds が createMeeting usecase に渡る。
 * - usecase が未登録 ID のエラー（field 付き）を返すと isError:true でエラー文言が返る。
 * - MCP update_meeting の externalContactIds 三値意味論（undefined/配列/null）が
 *   usecase にそのまま渡る。
 * - tools/list の inputSchema に externalContactIds が存在し externalAttendees が存在しない。
 * - description に「登録済み担当者ID」の制約が含まれる。
 *
 * 実 MCP transport 経由で tools/call / tools/list を発行する behavioral テスト。
 * ソース文字列照合は使用しない。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Interaction } from "@/domain/models/interaction";

// ---------------------------------------------------------------------------
// 共有状態
// ---------------------------------------------------------------------------

const state = {
  createMeetingCalls: [] as unknown[],
  createMeetingReturns: null as
    | { ok: true; meeting: Interaction }
    | { ok: false; reason: string; field?: "externalContactIds" }
    | null,
  updateMeetingCalls: [] as unknown[],
  updateMeetingReturns: null as
    | { ok: true; meeting: Interaction }
    | { ok: false; reason: string; field?: "externalContactIds" }
    | null,
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

mock.module("@/application/usecases/createMeeting", () => ({
  createMeeting: async (input: unknown) => {
    state.createMeetingCalls.push(input);
    return state.createMeetingReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

mock.module("@/application/usecases/updateMeeting", () => ({
  updateMeeting: async (input: unknown) => {
    state.updateMeetingCalls.push(input);
    return state.updateMeetingReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createMeeting", () => ({ createMeeting: realCreateMeeting }));
  mock.module("@/application/usecases/updateMeeting", () => ({ updateMeeting: realUpdateMeeting }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const MEETING_UUID = "123e4567-e89b-12d3-a456-426614174002";
const CONTACT_UUID = "aaaaaaaa-e89b-12d3-a456-426614174001";
const UNKNOWN_CONTACT_UUID = "cccccccc-e89b-12d3-a456-426614174001";

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

async function callInteractions(
  args: Record<string, unknown>,
  role = "admin",
  userId = "user-A",
  organizationId = "org-1"
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

type ToolInputSchema = {
  type?: string;
  properties?: Record<string, { type?: string; description?: string; enum?: string[]; anyOf?: unknown[] }>;
};

async function listTools(
  organizationId = "org-1"
): Promise<{ tools: Array<{ name: string; inputSchema: ToolInputSchema; description: string }> }> {
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
    extra: { userId: "user-A", organizationId, role: "admin" },
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
    result?: { tools?: Array<{ name: string; inputSchema: ToolInputSchema; description: string }> };
  };
  await transport.close();
  return { tools: body.result?.tools ?? [] };
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.createMeetingCalls = [];
  state.createMeetingReturns = null;
  state.updateMeetingCalls = [];
  state.updateMeetingReturns = null;
});

// ---------------------------------------------------------------------------
// モックデータ
// ---------------------------------------------------------------------------

const mockMeeting: Interaction = {
  id: "meeting-1",
  organizationId: "org-1",
  kind: "meeting",
  dealId: DEAL_UUID,
  inquiryId: null,
  contractId: null,
  invoiceId: null,
  clientId: null,
  meetingType: "hearing",
  date: new Date("2026-01-01"),
  location: null,
  attendees: [],
  summary: null,
  actionItems: [],
  details: null,
  createdById: "user-A",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("MCP externalContactIds — create_meeting", () => {
  it("externalContactIds が createMeeting usecase に配列のまま渡る", async () => {
    state.createMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
      externalContactIds: [CONTACT_UUID],
    });

    expect(result.isError).toBeUndefined();
    expect(state.createMeetingCalls).toHaveLength(1);
    const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.externalContactIds).toEqual([CONTACT_UUID]);
  });

  it("usecase が未登録 ID の field 付きエラーを返すと isError:true とエラー文言が返る", async () => {
    state.createMeetingReturns = {
      ok: false,
      reason: `未登録の担当者IDが含まれています: ${UNKNOWN_CONTACT_UUID}`,
      field: "externalContactIds",
    };

    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
      externalContactIds: [UNKNOWN_CONTACT_UUID],
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("未登録の担当者ID");
  });

  it("field なしのエラーは固定文言にマスクされる（内部詳細を漏らさない）", async () => {
    state.createMeetingReturns = { ok: false, reason: "案件が見つかりません" };

    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
    });

    expect(result.isError).toBe(true);
    expect(result.text).toBe("商談の記録に失敗しました");
  });

  it("externalContactIds なしの場合は undefined として createMeeting が呼ばれる", async () => {
    state.createMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
    });

    expect(result.isError).toBeUndefined();
    expect(state.createMeetingCalls).toHaveLength(1);
    const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.externalContactIds).toBeUndefined();
  });

  it("internalAttendees と externalContactIds を同時指定すると独立して渡る", async () => {
    state.createMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
      internalAttendees: ["社内 A"],
      externalContactIds: [CONTACT_UUID],
    });

    expect(result.isError).toBeUndefined();
    expect(state.createMeetingCalls).toHaveLength(1);
    const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
    const internal = callArgs.internalAttendees as Array<{ name: string; isExternal: boolean }>;
    expect(internal.map((a) => a.name)).toContain("社内 A");
    expect(internal.every((a) => a.isExternal === false)).toBe(true);
    expect(callArgs.externalContactIds).toEqual([CONTACT_UUID]);
  });
});

describe("MCP externalContactIds — update_meeting 部分更新意味論", () => {
  it("externalContactIds 省略 → usecase に externalContactIds: undefined が渡る（既存を保持）", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      summary: "新しいサマリ",
      // externalContactIds 省略
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.externalContactIds).toBeUndefined();
  });

  it("externalContactIds: null → usecase に null が渡る（クリア）", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: null,
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.externalContactIds).toBeNull();
  });

  it("externalContactIds に配列 → usecase に配列のまま渡る（差し替え）", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: [CONTACT_UUID],
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(callArgs.externalContactIds).toEqual([CONTACT_UUID]);
  });

  it("usecase が未登録 ID の field 付きエラーを返すと isError:true とエラー文言が返る", async () => {
    state.updateMeetingReturns = {
      ok: false,
      reason: `未登録の担当者IDが含まれています: ${UNKNOWN_CONTACT_UUID}`,
      field: "externalContactIds",
    };

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: [UNKNOWN_CONTACT_UUID],
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("未登録の担当者ID");
  });

  it("internalAttendees のみ指定 → externalContactIds は undefined（社外参加者は既存を保持）", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      internalAttendees: ["新しい社内参加者"],
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(Array.isArray(callArgs.internalAttendees)).toBe(true);
    expect(callArgs.externalContactIds).toBeUndefined();
  });
});

describe("MCP tools/list — externalContactIds 広告スキーマ検証", () => {
  it("interactions ツールの inputSchema に externalContactIds が存在する", async () => {
    const { tools } = await listTools();
    const interactionsTool = tools.find((t) => t.name === "interactions");
    expect(interactionsTool).toBeDefined();

    // 広告スキーマは buildAdvertisementSchema が生成するフラットな z.object()。
    // anyOf / discriminatedUnion ではなく、properties に全フィールドが直接列挙される。
    const hasExternalContactIds = "externalContactIds" in (interactionsTool!.inputSchema.properties ?? {});
    expect(hasExternalContactIds).toBe(true);
  });

  it("interactions ツールの inputSchema に externalAttendees が存在しない", async () => {
    const { tools } = await listTools();
    const interactionsTool = tools.find((t) => t.name === "interactions");
    expect(interactionsTool).toBeDefined();

    const hasExternalAttendees = "externalAttendees" in (interactionsTool!.inputSchema.properties ?? {});
    expect(hasExternalAttendees).toBeFalsy();
  });

  it("externalContactIds description に登録済み担当者 ID の制約が含まれる", async () => {
    const { tools } = await listTools();
    const interactionsTool = tools.find((t) => t.name === "interactions");
    expect(interactionsTool).toBeDefined();

    // 広告スキーマはフラット構造のため externalContactIds は単一プロパティとして存在する。
    // その description は create_meeting / update_meeting 双方の意味論を網羅している。
    const desc = interactionsTool!.inputSchema.properties?.externalContactIds?.description;
    expect(desc).toContain("登録済みの担当者ID");
  });

  it("externalContactIds description に update_meeting の部分更新意味論の説明が含まれる", async () => {
    const { tools } = await listTools();
    const interactionsTool = tools.find((t) => t.name === "interactions");
    expect(interactionsTool).toBeDefined();

    const desc = interactionsTool!.inputSchema.properties?.externalContactIds?.description;
    // 部分更新意味論（省略=保持、null=クリア）と登録済み担当者IDの制約が説明に含まれる
    expect(desc).toContain("省略時は既存の外部参加者を保持する");
    expect(desc).toContain("登録済みの担当者ID");
  });
});
