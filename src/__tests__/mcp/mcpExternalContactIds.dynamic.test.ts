/**
 * 社外参加者の顧客担当者参照化に関する behavioral テスト。
 *
 * - MCP create_meeting で externalContactIds に登録済み contactId を指定すると
 *   attendees に contactId と氏名スナップショットが保存される。
 * - 未登録 contactId を指定すると isError:true が返る。
 * - MCP update_meeting の externalContactIds 三値意味論（undefined/配列/null）を検証する。
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
  createMeetingReturns: null as { ok: true; meeting: Interaction } | { ok: false; reason: string } | null,
  updateMeetingCalls: [] as unknown[],
  updateMeetingReturns: null as { ok: true; meeting: Interaction } | { ok: false; reason: string } | null,
};

// 社外参加者 contactId 解決に使用するモック状態
const contactResolutionState = {
  interaction: null as Record<string, unknown> | null,
  deal: null as Record<string, unknown> | null,
  contacts: [] as Array<{ id: string; name: string }>,
  listClientContactsCallCount: 0,
};

// ---------------------------------------------------------------------------
// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
// ---------------------------------------------------------------------------

import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createMeetingModule from "@/application/usecases/createMeeting";
import * as updateMeetingModule from "@/application/usecases/updateMeeting";
import * as listClientContactsModule from "@/application/usecases/listClientContacts";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateMeeting = createMeetingModule.createMeeting;
const realUpdateMeeting = updateMeetingModule.updateMeeting;
const realListClientContacts = listClientContactsModule.listClientContacts;

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

mock.module("@/application/usecases/listClientContacts", () => ({
  listClientContacts: async () => {
    contactResolutionState.listClientContactsCallCount++;
    return contactResolutionState.contacts;
  },
}));

mock.module("@/infrastructure/repositories/interactionRepository", () => ({
  findById: async () => contactResolutionState.interaction,
}));

mock.module("@/infrastructure/repositories/dealRepository", () => ({
  findById: async () => contactResolutionState.deal,
}));

mock.module("@/infrastructure/repositories/inquiryRepository", () => ({
  findById: async () => null,
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createMeeting", () => ({ createMeeting: realCreateMeeting }));
  mock.module("@/application/usecases/updateMeeting", () => ({ updateMeeting: realUpdateMeeting }));
  mock.module("@/application/usecases/listClientContacts", () => ({
    listClientContacts: realListClientContacts,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const MEETING_UUID = "123e4567-e89b-12d3-a456-426614174002";
const CONTACT_UUID = "aaaaaaaa-e89b-12d3-a456-426614174001";
const CLIENT_UUID = "bbbbbbbb-e89b-12d3-a456-426614174001";
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
  contactResolutionState.interaction = null;
  contactResolutionState.deal = null;
  contactResolutionState.contacts = [];
  contactResolutionState.listClientContactsCallCount = 0;
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
  it("登録済み contactId を指定すると attendees に contactId と氏名スナップショットが保存される", async () => {
    state.createMeetingReturns = { ok: true, meeting: mockMeeting };
    // contactId 解決: deal → client → contacts
    contactResolutionState.deal = { clientId: CLIENT_UUID };
    contactResolutionState.contacts = [{ id: CONTACT_UUID, name: "山田 花子" }];

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
    const attendees = callArgs.attendees as Array<{
      userId: string | null;
      contactId: string | null;
      name: string;
      isExternal: boolean;
    }>;
    const externalAttendees = attendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].contactId).toBe(CONTACT_UUID);
    expect(externalAttendees[0].name).toBe("山田 花子");
    expect(externalAttendees[0].isExternal).toBe(true);
  });

  it("未登録の contactId を指定すると isError:true が返る", async () => {
    // contactId 解決: deal → client → 空の contacts
    contactResolutionState.deal = { clientId: CLIENT_UUID };
    contactResolutionState.contacts = [];

    const result = await callInteractions({
      operation: "create_meeting",
      dealId: DEAL_UUID,
      type: "hearing",
      date: "2026-01-01T00:00:00Z",
      externalContactIds: [UNKNOWN_CONTACT_UUID],
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("未登録の担当者ID");
    // createMeeting は呼ばれない
    expect(state.createMeetingCalls).toHaveLength(0);
  });

  it("externalContactIds なしの場合は社外参加者なしで createMeeting が呼ばれる", async () => {
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
    const attendees = callArgs.attendees as Array<{ isExternal: boolean }>;
    const externalAttendees = attendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(0);
  });

  it("internalAttendees と externalContactIds を同時指定できる", async () => {
    state.createMeetingReturns = { ok: true, meeting: mockMeeting };
    contactResolutionState.deal = { clientId: CLIENT_UUID };
    contactResolutionState.contacts = [{ id: CONTACT_UUID, name: "田中 太郎" }];

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
    const attendees = callArgs.attendees as Array<{ isExternal: boolean; name: string }>;
    expect(attendees.filter((a) => !a.isExternal).map((a) => a.name)).toContain("社内 A");
    expect(attendees.filter((a) => a.isExternal).map((a) => a.name)).toContain("田中 太郎");
  });
});

describe("MCP externalContactIds — update_meeting 部分更新意味論", () => {
  it("externalContactIds 省略 → usecase に externalAttendees: undefined が渡る（既存を保持）", async () => {
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
    expect(callArgs.externalAttendees).toBeUndefined();
  });

  it("externalContactIds: null → usecase に externalAttendees: [] が渡る（クリア）", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: null,
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(Array.isArray(callArgs.externalAttendees)).toBe(true);
    expect((callArgs.externalAttendees as unknown[]).length).toBe(0);
  });

  it("externalContactIds に配列 → contactId 解決後 externalAttendees MeetingAttendee[] が渡る（差し替え）", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };
    // update_meeting の contactId 解決: meetingId → interaction → dealId → deal → clientId
    contactResolutionState.interaction = { dealId: DEAL_UUID, inquiryId: null };
    contactResolutionState.deal = { clientId: CLIENT_UUID };
    contactResolutionState.contacts = [{ id: CONTACT_UUID, name: "鈴木 次郎" }];

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: [CONTACT_UUID],
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(Array.isArray(callArgs.externalAttendees)).toBe(true);
    const external = callArgs.externalAttendees as Array<{
      contactId: string;
      name: string;
      isExternal: boolean;
    }>;
    expect(external).toHaveLength(1);
    expect(external[0].contactId).toBe(CONTACT_UUID);
    expect(external[0].name).toBe("鈴木 次郎");
    expect(external[0].isExternal).toBe(true);
  });

  it("externalContactIds に未登録 ID → isError:true が返る", async () => {
    contactResolutionState.interaction = { dealId: DEAL_UUID, inquiryId: null };
    contactResolutionState.deal = { clientId: CLIENT_UUID };
    contactResolutionState.contacts = [];

    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: [UNKNOWN_CONTACT_UUID],
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("未登録の担当者ID");
    expect(state.updateMeetingCalls).toHaveLength(0);
  });

  it("internalAttendees のみ指定 → externalAttendees は undefined（社外参加者は既存を保持）", async () => {
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
    expect(callArgs.externalAttendees).toBeUndefined();
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

// ---------------------------------------------------------------------------
// TC-020: 担当者削除後も既存商談記録の社外参加者氏名スナップショットが維持される
//
// 名前はスナップショットとして attendees JSONB に保存済みのため、
// 担当者が削除されても read 経路で listClientContacts を呼ぶ必要はない。
// update_meeting で externalContactIds を省略した場合に listClientContacts が
// 呼ばれないことを regression として固定する。
// ---------------------------------------------------------------------------

describe("TC-020: 担当者削除後も社外参加者氏名スナップショットが維持される（listClientContacts 非呼び出し）", () => {
  it("externalContactIds を省略した update_meeting では listClientContacts が呼ばれない", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      summary: "サマリのみ更新",
      // externalContactIds は省略 → 既存の社外参加者（氏名スナップショット）を保持
    });

    expect(contactResolutionState.listClientContactsCallCount).toBe(0);
  });

  it("externalContactIds: null（クリア）でも listClientContacts が呼ばれない", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: null,
    });

    expect(contactResolutionState.listClientContactsCallCount).toBe(0);
  });

  it("externalContactIds 省略 → updateMeeting に externalAttendees: undefined が渡り既存スナップショットが保持される", async () => {
    state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

    await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      internalAttendees: ["社内 参加者"],
      // externalContactIds は省略 → 削除済み担当者の氏名スナップショットを保持
    });

    expect(state.updateMeetingCalls).toHaveLength(1);
    const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
    // externalAttendees が undefined → usecase 層で既存 attendees の外部側を保持する
    expect(callArgs.externalAttendees).toBeUndefined();
    expect(contactResolutionState.listClientContactsCallCount).toBe(0);
  });
});
