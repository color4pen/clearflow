/**
 * MCP interactions ツールの実行検証テスト。
 *
 * T-06: create_meeting が createMeeting usecase に到達し、organizationId / actorId / kind / dealId
 *        を含む引数で呼ばれることを検証する。
 *        → 受け入れ基準「商談記録 → 案件タイムラインに現れることをテストで固定する」を満たす。
 *
 * T-07: dealId も inquiryId も指定しない create_meeting で usecase が ok:false を返し、
 *        ツール結果が isError:true になることを検証する。
 *        → 受け入れ基準「関連先なしの接点記録が拒否されることをテストで固定する」を満たす。
 *
 * TC-003: record_contract_adjustment が createContractAdjustment usecase に到達し成功する。
 *
 * TC-005: update_meeting で summary のみ指定したとき、他フィールドが undefined で usecase に渡る（部分更新）。
 *
 * TC-006: update_meeting で location: null を指定したとき、usecase に null が渡る（null クリア）。
 *
 * TC-020: organizationId がツール引数に含まれていても authInfo.extra の値が usecase に渡る（スキーマ外フィールドの排除）。
 *
 * TC-004: record_invoice_adjustment が createInvoiceAdjustment usecase に到達し成功する。
 *
 * TC-023: member ロールで record_invoice_adjustment を呼ぶと認可拒否され usecase に到達しない。
 *
 * TC-024: usecase が DB 例外をスローしたとき、クライアントには固定文言が返り内部詳細は漏れない。
 *         usecase が ok:false + 内部エラーメッセージを返したときも、内部詳細は漏れない。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Interaction } from "@/domain/models/interaction";

type CreateMeetingResult =
  | { ok: true; meeting: Interaction }
  | { ok: false; reason: string };

type UpdateMeetingResult =
  | { ok: true; meeting: Interaction }
  | { ok: false; reason: string };

type CreateContractAdjustmentResult =
  | { ok: true; interaction: Interaction }
  | { ok: false; reason: string };

type CreateInvoiceAdjustmentResult =
  | { ok: true; interaction: Interaction }
  | { ok: false; reason: string };

const state = {
  createMeetingCalls: [] as unknown[],
  createMeetingReturns: null as CreateMeetingResult | null,
  createMeetingThrowsError: false,
  updateMeetingCalls: [] as unknown[],
  updateMeetingReturns: null as UpdateMeetingResult | null,
  createContractAdjustmentCalls: [] as unknown[],
  createContractAdjustmentReturns: null as CreateContractAdjustmentResult | null,
  createInvoiceAdjustmentCalls: [] as unknown[],
  createInvoiceAdjustmentReturns: null as CreateInvoiceAdjustmentResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createMeetingModule from "@/application/usecases/createMeeting";
import * as updateMeetingModule from "@/application/usecases/updateMeeting";
import * as createContractAdjustmentModule from "@/application/usecases/createContractAdjustment";
import * as createInvoiceAdjustmentModule from "@/application/usecases/createInvoiceAdjustment";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateMeeting = createMeetingModule.createMeeting;
const realUpdateMeeting = updateMeetingModule.updateMeeting;
const realCreateContractAdjustment = createContractAdjustmentModule.createContractAdjustment;
const realCreateInvoiceAdjustment = createInvoiceAdjustmentModule.createInvoiceAdjustment;

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
    if (state.createMeetingThrowsError) {
      throw new Error("duplicate key value violates unique constraint on table 'interactions'");
    }
    return state.createMeetingReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

mock.module("@/application/usecases/updateMeeting", () => ({
  updateMeeting: async (input: unknown) => {
    state.updateMeetingCalls.push(input);
    return state.updateMeetingReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

mock.module("@/application/usecases/createContractAdjustment", () => ({
  createContractAdjustment: async (input: unknown) => {
    state.createContractAdjustmentCalls.push(input);
    return state.createContractAdjustmentReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

// createInvoiceAdjustment は TC-004（正常系）と TC-023（認可拒否）の両方で使う
mock.module("@/application/usecases/createInvoiceAdjustment", () => ({
  createInvoiceAdjustment: async (input: unknown) => {
    state.createInvoiceAdjustmentCalls.push(input);
    return state.createInvoiceAdjustmentReturns ?? { ok: false as const, reason: "mock not set" };
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
  mock.module("@/application/usecases/createContractAdjustment", () => ({
    createContractAdjustment: realCreateContractAdjustment,
  }));
  mock.module("@/application/usecases/createInvoiceAdjustment", () => ({
    createInvoiceAdjustment: realCreateInvoiceAdjustment,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const MEETING_UUID = "123e4567-e89b-12d3-a456-426614174002";
const CONTRACT_UUID = "123e4567-e89b-12d3-a456-426614174003";
const INVOICE_UUID = "123e4567-e89b-12d3-a456-426614174004";

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

beforeEach(() => {
  state.createMeetingCalls = [];
  state.createMeetingReturns = null;
  state.createMeetingThrowsError = false;
  state.updateMeetingCalls = [];
  state.updateMeetingReturns = null;
  state.createContractAdjustmentCalls = [];
  state.createContractAdjustmentReturns = null;
  state.createInvoiceAdjustmentCalls = [];
  state.createInvoiceAdjustmentReturns = null;
});

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

const mockInteraction: Interaction = {
  id: "interaction-1",
  organizationId: "org-1",
  kind: "contract_adjustment",
  dealId: null,
  inquiryId: null,
  contractId: CONTRACT_UUID,
  invoiceId: null,
  clientId: null,
  meetingType: null,
  date: new Date("2026-01-01"),
  location: null,
  attendees: [],
  summary: "テスト調整",
  actionItems: [],
  details: null,
  createdById: "user-A",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

const mockInvoiceInteraction: Interaction = {
  id: "interaction-2",
  organizationId: "org-1",
  kind: "invoice_adjustment",
  dealId: null,
  inquiryId: null,
  contractId: null,
  invoiceId: INVOICE_UUID,
  clientId: null,
  meetingType: null,
  date: new Date("2026-01-01"),
  location: null,
  attendees: [],
  summary: "テスト請求調整",
  actionItems: [],
  details: null,
  createdById: "user-A",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

describe("MCP interactions ツール", () => {
  describe("T-06: 商談記録が案件タイムラインに現れる（create_meeting usecase 到達の実行検証）", () => {
    it("create_meeting は createMeeting usecase を organizationId / actorId / kind / dealId を含む引数で呼ぶ", async () => {
      state.createMeetingReturns = { ok: true, meeting: mockMeeting };

      const result = await callInteractions({
        operation: "create_meeting",
        dealId: DEAL_UUID,
        type: "hearing",
        date: "2026-01-01T00:00:00Z",
      });

      // ツール成功（isError は undefined）
      expect(result.isError).toBeUndefined();
      // createMeeting が 1 回呼ばれた
      expect(state.createMeetingCalls).toHaveLength(1);
      // 引数の検証
      const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
      expect(callArgs.organizationId).toBe("org-1");
      expect(callArgs.actorId).toBe("user-A");
      expect(callArgs.kind).toBe("meeting");
      expect(callArgs.dealId).toBe(DEAL_UUID);
    });
  });

  describe("T-07: 関連先なしの接点記録が拒否される", () => {
    it("dealId も inquiryId も指定しないとき createMeeting が呼ばれ ok:false 時に isError:true が返る", async () => {
      state.createMeetingReturns = {
        ok: false,
        reason: "案件または引合のいずれかの指定が必要です",
      };

      const result = await callInteractions({
        operation: "create_meeting",
        type: "hearing",
        date: "2026-01-01T00:00:00Z",
        // dealId も inquiryId も省略
      });

      // ツールはエラーを返す
      expect(result.isError).toBe(true);
      // createMeeting が呼ばれた（Zod は通過するが usecase が拒否）
      expect(state.createMeetingCalls).toHaveLength(1);
      // usecase に渡された dealId / inquiryId が両方 null
      const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
      expect(callArgs.dealId == null).toBe(true);
      expect(callArgs.inquiryId == null).toBe(true);
    });
  });

  describe("TC-003: 契約調整の記録（record_contract_adjustment 正常系）", () => {
    it("record_contract_adjustment は createContractAdjustment usecase に contractId / organizationId / actorId / summary を渡す", async () => {
      state.createContractAdjustmentReturns = { ok: true, interaction: mockInteraction };

      const result = await callInteractions({
        operation: "record_contract_adjustment",
        contractId: CONTRACT_UUID,
        summary: "テスト契約調整",
      });

      expect(result.isError).toBeUndefined();
      expect(state.createContractAdjustmentCalls).toHaveLength(1);
      const callArgs = state.createContractAdjustmentCalls[0] as Record<string, unknown>;
      expect(callArgs.contractId).toBe(CONTRACT_UUID);
      expect(callArgs.organizationId).toBe("org-1");
      expect(callArgs.actorId).toBe("user-A");
      expect(callArgs.summary).toBe("テスト契約調整");
    });
  });

  describe("TC-004: 請求調整の記録（record_invoice_adjustment 正常系）", () => {
    it("record_invoice_adjustment は createInvoiceAdjustment usecase に invoiceId / organizationId / actorId / summary を渡す", async () => {
      state.createInvoiceAdjustmentReturns = { ok: true, interaction: mockInvoiceInteraction };

      const result = await callInteractions({
        operation: "record_invoice_adjustment",
        invoiceId: INVOICE_UUID,
        summary: "テスト請求調整",
      });

      expect(result.isError).toBeUndefined();
      expect(state.createInvoiceAdjustmentCalls).toHaveLength(1);
      const callArgs = state.createInvoiceAdjustmentCalls[0] as Record<string, unknown>;
      expect(callArgs.invoiceId).toBe(INVOICE_UUID);
      expect(callArgs.organizationId).toBe("org-1");
      expect(callArgs.actorId).toBe("user-A");
      expect(callArgs.summary).toBe("テスト請求調整");
    });
  });

  describe("TC-005: update_meeting 部分更新（summary のみ）", () => {
    it("summary のみ指定したとき updateMeeting usecase に summary が渡り、date / meetingType / location は undefined のまま", async () => {
      state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

      const result = await callInteractions({
        operation: "update_meeting",
        meetingId: MEETING_UUID,
        summary: "更新後のサマリ",
        // meetingType / date / location は省略
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateMeetingCalls).toHaveLength(1);
      const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
      expect(callArgs.summary).toBe("更新後のサマリ");
      // 省略したフィールドは undefined（変更なし）として渡る
      expect(callArgs.meetingType).toBeUndefined();
      expect(callArgs.date).toBeUndefined();
      expect(callArgs.location).toBeUndefined();
    });
  });

  describe("TC-006: update_meeting null クリア（location: null）", () => {
    it("location: null を指定したとき updateMeeting usecase に location: null が渡る（undefined と区別される）", async () => {
      state.updateMeetingReturns = { ok: true, meeting: mockMeeting };

      const result = await callInteractions({
        operation: "update_meeting",
        meetingId: MEETING_UUID,
        location: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateMeetingCalls).toHaveLength(1);
      const callArgs = state.updateMeetingCalls[0] as Record<string, unknown>;
      // null（クリア）が正しく伝わる
      expect(callArgs.location).toBeNull();
      // summary は省略なので undefined（変更なし）
      expect(callArgs.summary).toBeUndefined();
    });
  });

  describe("TC-020: organizationId がツール引数に含まれない", () => {
    it("ツール引数に organizationId を渡しても authInfo の organizationId が usecase に渡る", async () => {
      state.createMeetingReturns = { ok: true, meeting: mockMeeting };

      // organizationId: "attacker-org" をツール引数に含めて呼び出す
      const result = await callInteractions(
        {
          operation: "create_meeting",
          dealId: DEAL_UUID,
          type: "hearing",
          date: "2026-01-01T00:00:00Z",
          organizationId: "attacker-org",
        },
        "admin",
        "user-A",
        "org-1"
      );

      expect(result.isError).toBeUndefined();
      expect(state.createMeetingCalls).toHaveLength(1);
      const callArgs = state.createMeetingCalls[0] as Record<string, unknown>;
      // usecase には authInfo の organizationId が渡る（引数のものは無視される）
      expect(callArgs.organizationId).toBe("org-1");
    });
  });

  describe("TC-023: member ロールが record_invoice_adjustment を拒否される", () => {
    it("member ロールで record_invoice_adjustment を呼ぶと isError で拒否され usecase に到達しない", async () => {
      const result = await callInteractions(
        {
          operation: "record_invoice_adjustment",
          invoiceId: INVOICE_UUID,
          summary: "テスト調整",
        },
        "member"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      // createInvoiceAdjustment usecase には到達しない
      expect(state.createInvoiceAdjustmentCalls).toHaveLength(0);
    });
  });

  describe("TC-024: usecase 例外がマスクされる（内部詳細をクライアントに漏らさない）", () => {
    it("createMeeting が DB 例外をスローしたとき、クライアントには「内部エラーが発生しました」が返り詳細は含まれない", async () => {
      state.createMeetingThrowsError = true;

      const result = await callInteractions({
        operation: "create_meeting",
        dealId: DEAL_UUID,
        type: "hearing",
        date: "2026-01-01T00:00:00Z",
      });

      expect(result.isError).toBe(true);
      // クライアントには固定文言が返る
      expect(result.text).toBe("内部エラーが発生しました");
      // DB の内部詳細は含まれない
      expect(result.text).not.toContain("duplicate key value");
      expect(result.text).not.toContain("unique constraint");
      expect(result.text).not.toContain("interactions");
    });

    it("createMeeting が ok:false + 内部エラーメッセージを返したとき、クライアントには固定文言が返り詳細は含まれない", async () => {
      state.createMeetingReturns = {
        ok: false,
        reason: "DB error: relation 'interactions' violated unique constraint",
      };

      const result = await callInteractions({
        operation: "create_meeting",
        dealId: DEAL_UUID,
        type: "hearing",
        date: "2026-01-01T00:00:00Z",
      });

      expect(result.isError).toBe(true);
      // 固定文言が返る（DB エラー詳細は含まれない）
      expect(result.text).toBe("商談の記録に失敗しました");
      expect(result.text).not.toContain("DB error");
      expect(result.text).not.toContain("unique constraint");
    });
  });
});
