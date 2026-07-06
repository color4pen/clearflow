/**
 * MCP invoices ツールの実行検証テスト。
 *
 * T-07: 未発行請求の入金記録が拒否されること（inv-invoice-must-be-issued-before-paid）をテストで固定する。
 *       updateInvoiceStatus が scheduled → paid の遷移で ok:false を返すとき、
 *       ツール結果が isError: true になること、および usecase 引数に newStatus: "paid" が含まれることを検証する。
 *
 * T-08: 入金記録に入金日が正しく伝播することをテストで固定する。
 *       paidAt 文字列 → Date 変換されて usecase に渡ること、および省略時は undefined であることを検証する。
 *
 * T-10 (invoices): version 不一致の更新が衝突エラーになることをテストで固定する。
 *       updateInvoice が version 不一致 reason を返すとき、ツール結果が isError: true になる。
 *
 * TC-016: 将来日付 paidAt の拒否を実行検証で固定する。
 *         paidAt: '2099-12-31' で update_status を呼んだとき、MCP レイヤーが isError: true を返し
 *         updateInvoiceStatus usecase が呼ばれないことを検証する。
 *
 * TC-039: invoices update の null vs undefined 区別を実行検証で固定する。
 *         notes: null と issueDate 省略で update を呼んだとき、
 *         usecase 引数の notes === null かつ issueDate === undefined であることを検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Invoice } from "@/domain/models/invoice";

type UpdateInvoiceStatusResult = { ok: true; invoice: Invoice } | { ok: false; reason: string };
type UpdateInvoiceResult = { ok: true; invoice: Invoice } | { ok: false; reason: string };

const state = {
  updateInvoiceStatusCalls: [] as unknown[],
  updateInvoiceStatusReturns: null as UpdateInvoiceStatusResult | null,
  updateInvoiceCalls: [] as unknown[],
  updateInvoiceReturns: null as UpdateInvoiceResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as updateInvoiceStatusModule from "@/application/usecases/updateInvoiceStatus";
import * as updateInvoiceModule from "@/application/usecases/updateInvoice";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realUpdateInvoiceStatus = updateInvoiceStatusModule.updateInvoiceStatus;
const realUpdateInvoice = updateInvoiceModule.updateInvoice;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/updateInvoiceStatus", () => ({
  updateInvoiceStatus: async (input: unknown) => {
    state.updateInvoiceStatusCalls.push(input);
    return state.updateInvoiceStatusReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

mock.module("@/application/usecases/updateInvoice", () => ({
  updateInvoice: async (input: unknown) => {
    state.updateInvoiceCalls.push(input);
    return state.updateInvoiceReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/updateInvoiceStatus", () => ({
    updateInvoiceStatus: realUpdateInvoiceStatus,
  }));
  mock.module("@/application/usecases/updateInvoice", () => ({
    updateInvoice: realUpdateInvoice,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerInvoicesTools } = await import("../../app/api/mcp/tools/invoices");

const INVOICE_UUID = "123e4567-e89b-12d3-a456-426614174001";

async function callInvoices(
  args: Record<string, unknown>,
  role = "finance",
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerInvoicesTools(server);
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
      params: { name: "invoices", arguments: args },
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
  state.updateInvoiceStatusCalls = [];
  state.updateInvoiceStatusReturns = null;
  state.updateInvoiceCalls = [];
  state.updateInvoiceReturns = null;
});

describe("MCP invoices ツール", () => {
  describe("T-07: 未発行請求の入金記録が拒否される", () => {
    it("updateInvoiceStatus が scheduled → paid の遷移で ok:false を返すとき、ツール結果が isError:true になる", async () => {
      state.updateInvoiceStatusReturns = {
        ok: false,
        reason: "scheduled から paid への遷移は許可されていません",
      };

      const result = await callInvoices({
        operation: "update_status",
        invoiceId: INVOICE_UUID,
        newStatus: "paid",
      });

      expect(result.isError).toBe(true);
      // updateInvoiceStatus usecase に到達した
      expect(state.updateInvoiceStatusCalls).toHaveLength(1);
      // usecase に渡された引数に newStatus: "paid" が含まれる
      const callArgs = state.updateInvoiceStatusCalls[0] as Record<string, unknown>;
      expect(callArgs.newStatus).toBe("paid");
    });
  });

  describe("T-08: 入金記録に入金日が正しく伝播する", () => {
    it("paidAt 指定あり（文字列）で update_status を呼ぶと usecase に paidAt が Date オブジェクトとして渡される", async () => {
      state.updateInvoiceStatusReturns = { ok: false as const, reason: "mock" };

      await callInvoices({
        operation: "update_status",
        invoiceId: INVOICE_UUID,
        newStatus: "paid",
        paidAt: "2026-01-01",
      });

      expect(state.updateInvoiceStatusCalls).toHaveLength(1);
      const callArgs = state.updateInvoiceStatusCalls[0] as Record<string, unknown>;
      // paidAt が Date オブジェクト（文字列 → Date 変換）として渡されている
      expect(callArgs.paidAt).toBeInstanceOf(Date);
      // paidAt の値が正しい（"2026-01-01" の UTC midnight）
      expect((callArgs.paidAt as Date).toISOString().startsWith("2026-01-01")).toBe(true);
    });

    it("paidAt 省略で update_status を呼ぶと usecase 引数の paidAt が undefined になる", async () => {
      state.updateInvoiceStatusReturns = { ok: false as const, reason: "mock" };

      await callInvoices({
        operation: "update_status",
        invoiceId: INVOICE_UUID,
        newStatus: "paid",
        // paidAt は省略
      });

      expect(state.updateInvoiceStatusCalls).toHaveLength(1);
      const callArgs = state.updateInvoiceStatusCalls[0] as Record<string, unknown>;
      // paidAt は undefined（usecase のデフォルト動作に委ねる）
      expect(callArgs.paidAt).toBeUndefined();
    });
  });

  describe("T-10: version 不一致の更新が衝突エラーになる（invoices）", () => {
    it("updateInvoice が version 不一致 reason を返すとき、ツール結果が isError:true になる", async () => {
      state.updateInvoiceReturns = {
        ok: false,
        reason: "この請求は他のユーザーによって更新されました。画面を更新してください",
      };

      const result = await callInvoices({
        operation: "update",
        invoiceId: INVOICE_UUID,
        amount: 500_000,
      });

      expect(result.isError).toBe(true);
      expect(result.text).toContain("この請求は他のユーザーによって更新されました");
      // updateInvoice usecase に到達した
      expect(state.updateInvoiceCalls).toHaveLength(1);
    });
  });

  describe("TC-016: 将来日付 paidAt の拒否", () => {
    it("paidAt が将来日付（2099-12-31）のとき、ツール結果が isError:true になり updateInvoiceStatus が呼ばれない", async () => {
      const result = await callInvoices({
        operation: "update_status",
        invoiceId: INVOICE_UUID,
        newStatus: "paid",
        paidAt: "2099-12-31",
      });

      expect(result.isError).toBe(true);
      // MCP レイヤーで拒否されるため updateInvoiceStatus usecase に到達しない
      expect(state.updateInvoiceStatusCalls).toHaveLength(0);
    });
  });

  describe("TC-039: invoices update の null vs undefined 区別", () => {
    it("notes: null と issueDate 省略で update を呼ぶと、usecase 引数の notes === null かつ issueDate === undefined になる", async () => {
      state.updateInvoiceReturns = { ok: false as const, reason: "mock" };

      await callInvoices({
        operation: "update",
        invoiceId: INVOICE_UUID,
        notes: null,
        // issueDate は省略（変更なし）
      });

      expect(state.updateInvoiceCalls).toHaveLength(1);
      const callArgs = state.updateInvoiceCalls[0] as Record<string, unknown>;
      // null（クリア）と undefined（変更なし）が正しく区別される
      expect(callArgs.notes).toBeNull();
      expect(callArgs.issueDate).toBeUndefined();
    });
  });
});
