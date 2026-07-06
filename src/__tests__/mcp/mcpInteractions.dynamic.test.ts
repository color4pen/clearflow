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
 * TC-023: member ロールで record_invoice_adjustment を呼ぶと認可拒否され usecase に到達しない。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Interaction } from "@/domain/models/interaction";

type CreateMeetingResult =
  | { ok: true; meeting: Interaction }
  | { ok: false; reason: string };

const state = {
  createMeetingCalls: [] as unknown[],
  createMeetingReturns: null as CreateMeetingResult | null,
  createInvoiceAdjustmentCalls: [] as unknown[],
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createMeetingModule from "@/application/usecases/createMeeting";
import * as createInvoiceAdjustmentModule from "@/application/usecases/createInvoiceAdjustment";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateMeeting = createMeetingModule.createMeeting;
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
    return state.createMeetingReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

// createInvoiceAdjustment は TC-023 の「呼ばれないこと」の検証に使う
mock.module("@/application/usecases/createInvoiceAdjustment", () => ({
  createInvoiceAdjustment: async (input: unknown) => {
    state.createInvoiceAdjustmentCalls.push(input);
    return { ok: false as const, reason: "should not be reached in authorization test" };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createMeeting", () => ({
    createMeeting: realCreateMeeting,
  }));
  mock.module("@/application/usecases/createInvoiceAdjustment", () => ({
    createInvoiceAdjustment: realCreateInvoiceAdjustment,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const INVOICE_UUID = "123e4567-e89b-12d3-a456-426614174002";

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
  state.createInvoiceAdjustmentCalls = [];
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
});
