/**
 * MCP invoices ツールの一覧取得成功シナリオ実行検証テスト。
 *
 * TC-009: 請求一覧・契約別（list with contractId）が正常に動作する。
 *         contractId 指定あり → listInvoicesByContract usecase が呼ばれ、
 *         organizationId と contractId が authInfo および引数から正しく伝播すること、
 *         ツール結果が isError なしで invoices データを含むことを検証する。
 *
 * TC-010: 請求一覧・組織全体（list without contractId）が正常に動作する。
 *         contractId 指定なし → listInvoicesByOrganization usecase が呼ばれ、
 *         organizationId が authInfo から伝播すること、
 *         ツール結果が isError なしで invoices データを含むことを検証する。
 *
 * TC-017: invoices 部分更新（amount のみ）成功シナリオ。
 *         amount のみ指定して update を呼んだとき updateInvoice が ok:true を返し、
 *         ツール結果が isError なしで invoice データを含むことを検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Invoice } from "@/domain/models/invoice";

type UpdateInvoiceResult = { ok: true; invoice: Invoice } | { ok: false; reason: string };

const state = {
  listInvoicesByContractCalls: [] as unknown[],
  listInvoicesByContractReturns: null as Invoice[] | null,
  listInvoicesByOrganizationCalls: [] as unknown[],
  listInvoicesByOrganizationReturns: null as Invoice[] | null,
  updateInvoiceCalls: [] as unknown[],
  updateInvoiceReturns: null as UpdateInvoiceResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as listInvoicesByContractModule from "@/application/usecases/listInvoicesByContract";
import * as listInvoicesByOrganizationModule from "@/application/usecases/listInvoicesByOrganization";
import * as updateInvoiceModule from "@/application/usecases/updateInvoice";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realListInvoicesByContract = listInvoicesByContractModule.listInvoicesByContract;
const realListInvoicesByOrganization =
  listInvoicesByOrganizationModule.listInvoicesByOrganization;
const realUpdateInvoice = updateInvoiceModule.updateInvoice;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/listInvoicesByContract", () => ({
  listInvoicesByContract: async (input: unknown) => {
    state.listInvoicesByContractCalls.push(input);
    return state.listInvoicesByContractReturns ?? [];
  },
}));

mock.module("@/application/usecases/listInvoicesByOrganization", () => ({
  listInvoicesByOrganization: async (input: unknown) => {
    state.listInvoicesByOrganizationCalls.push(input);
    return state.listInvoicesByOrganizationReturns ?? [];
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
  mock.module("@/application/usecases/listInvoicesByContract", () => ({
    listInvoicesByContract: realListInvoicesByContract,
  }));
  mock.module("@/application/usecases/listInvoicesByOrganization", () => ({
    listInvoicesByOrganization: realListInvoicesByOrganization,
  }));
  mock.module("@/application/usecases/updateInvoice", () => ({
    updateInvoice: realUpdateInvoice,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerInvoicesTools } = await import("../../app/api/mcp/tools/invoices");

const CONTRACT_UUID = "123e4567-e89b-12d3-a456-426614174002";
const INVOICE_UUID = "123e4567-e89b-12d3-a456-426614174003";

const mockInvoice: Invoice = {
  id: INVOICE_UUID,
  organizationId: "org-1",
  contractId: CONTRACT_UUID,
  title: "テスト請求",
  amount: 500_000,
  issueDate: null,
  dueDate: new Date("2026-03-31"),
  status: "scheduled",
  invoicedAt: null,
  paidAt: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

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
  state.listInvoicesByContractCalls = [];
  state.listInvoicesByContractReturns = null;
  state.listInvoicesByOrganizationCalls = [];
  state.listInvoicesByOrganizationReturns = null;
  state.updateInvoiceCalls = [];
  state.updateInvoiceReturns = null;
});

describe("MCP invoices ツール 一覧取得成功シナリオ", () => {
  describe("TC-009: 請求一覧・契約別（list with contractId）", () => {
    it("contractId 指定あり で list を呼ぶと listInvoicesByContract usecase が実行され、ツール結果が isError なしで invoices データを含む", async () => {
      state.listInvoicesByContractReturns = [mockInvoice];

      const result = await callInvoices({
        operation: "list",
        contractId: CONTRACT_UUID,
      });

      expect(result.isError).toBeUndefined();
      // listInvoicesByContract usecase に到達した（listInvoicesByOrganization ではない）
      expect(state.listInvoicesByContractCalls).toHaveLength(1);
      expect(state.listInvoicesByOrganizationCalls).toHaveLength(0);
      // usecase に contractId と organizationId が正しく渡された
      const callArgs = state.listInvoicesByContractCalls[0] as Record<string, unknown>;
      expect(callArgs.contractId).toBe(CONTRACT_UUID);
      expect(callArgs.organizationId).toBe("org-1");
      // レスポンスに請求データが含まれる
      const parsed = JSON.parse(result.text) as unknown[];
      expect(parsed).toHaveLength(1);
    });
  });

  describe("TC-010: 請求一覧・組織全体（list without contractId）", () => {
    it("contractId 省略で list を呼ぶと listInvoicesByOrganization usecase が実行され、ツール結果が isError なしで invoices データを含む", async () => {
      state.listInvoicesByOrganizationReturns = [mockInvoice];

      const result = await callInvoices({ operation: "list" });

      expect(result.isError).toBeUndefined();
      // listInvoicesByOrganization usecase に到達した（listInvoicesByContract ではない）
      expect(state.listInvoicesByOrganizationCalls).toHaveLength(1);
      expect(state.listInvoicesByContractCalls).toHaveLength(0);
      // usecase に organizationId が authInfo から正しく渡された
      const callArgs = state.listInvoicesByOrganizationCalls[0] as Record<string, unknown>;
      expect(callArgs.organizationId).toBe("org-1");
      // レスポンスに請求データが含まれる
      const parsed = JSON.parse(result.text) as unknown[];
      expect(parsed).toHaveLength(1);
    });
  });

  describe("TC-017: invoices 部分更新（amount のみ）成功", () => {
    it("amount のみ指定して update を呼んで updateInvoice が ok:true を返すとき、ツール結果が isError なしで invoice データを含む", async () => {
      state.updateInvoiceReturns = { ok: true, invoice: mockInvoice };

      const result = await callInvoices({
        operation: "update",
        invoiceId: INVOICE_UUID,
        amount: 600_000,
        // 他のフィールドはすべて省略（部分更新）
      });

      expect(result.isError).toBeUndefined();
      // updateInvoice usecase に到達した
      expect(state.updateInvoiceCalls).toHaveLength(1);
      const callArgs = state.updateInvoiceCalls[0] as Record<string, unknown>;
      expect(callArgs.invoiceId).toBe(INVOICE_UUID);
      expect(callArgs.amount).toBe(600_000);
      // 省略フィールドは undefined（変更なし）として渡される
      expect(callArgs.title).toBeUndefined();
      expect(callArgs.issueDate).toBeUndefined();
    });
  });
});
