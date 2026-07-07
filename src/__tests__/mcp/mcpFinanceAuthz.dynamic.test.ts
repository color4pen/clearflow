/**
 * MCP 経理系ツールの認可 runtime テスト（T-09）。
 *
 * 受け入れ基準「finance / member ロールの操作可否が Server Action と同一判定になることをテストで固定する」を満たす。
 *
 * 検証内容:
 * - member ロールが contracts.create を拒否され、createContract usecase に到達しないこと
 * - finance ロールが contracts.create を許可され、createContract usecase に到達すること
 * - member ロールが invoices.create を拒否され、createInvoice usecase に到達しないこと
 * - finance ロールが invoices.update_status を許可され、updateInvoiceStatus usecase に到達すること
 * - member ロールが revenue_targets.set を拒否され、setRevenueTarget usecase に到達しないこと
 * - finance ロールが revenue_targets.set を拒否されること（admin / manager のみ許可）
 *
 * 認可マトリクス（domain/authorization.ts）:
 *   contract: create → admin, manager, finance
 *   invoice: create → admin, finance
 *   invoice: changeStatus → admin, finance
 *   revenue: setTarget → admin, manager （finance は含まれない）
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Contract } from "@/domain/models/contract";
import type { Invoice } from "@/domain/models/invoice";

const state = {
  createContractCalls: [] as unknown[],
  createInvoiceCalls: [] as unknown[],
  updateInvoiceStatusCalls: [] as unknown[],
  setRevenueTargetCalls: [] as unknown[],
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createContractModule from "@/application/usecases/createContract";
import * as createInvoiceModule from "@/application/usecases/createInvoice";
import * as updateInvoiceStatusModule from "@/application/usecases/updateInvoiceStatus";
import * as setRevenueTargetModule from "@/application/usecases/setRevenueTarget";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateContract = createContractModule.createContract;
const realCreateInvoice = createInvoiceModule.createInvoice;
const realUpdateInvoiceStatus = updateInvoiceStatusModule.updateInvoiceStatus;
const realSetRevenueTarget = setRevenueTargetModule.setRevenueTarget;

const mockContract: Contract = {
  id: "123e4567-e89b-12d3-a456-426614174002",
  organizationId: "org-1",
  dealId: "123e4567-e89b-12d3-a456-426614174001",
  clientId: "client-1",
  title: "テスト契約",
  contractType: null,
  amount: 1_000_000,
  startDate: new Date("2026-01-01"),
  endDate: null,
  paymentTerms: null,
  renewalType: "one_time",
  renewalCycle: null,
  status: "active",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

const mockInvoice: Invoice = {
  id: "123e4567-e89b-12d3-a456-426614174003",
  organizationId: "org-1",
  contractId: "123e4567-e89b-12d3-a456-426614174002",
  title: "テスト請求",
  amount: 500_000,
  issueDate: new Date("2026-01-15"),
  dueDate: new Date("2026-03-31"),
  status: "invoiced",
  invoicedAt: new Date("2026-01-15"),
  paidAt: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/createContract", () => ({
  createContract: async (input: unknown) => {
    state.createContractCalls.push(input);
    return { ok: true as const, contract: mockContract };
  },
}));

mock.module("@/application/usecases/createInvoice", () => ({
  createInvoice: async (input: unknown) => {
    state.createInvoiceCalls.push(input);
    return { ok: true as const, invoice: mockInvoice };
  },
}));

mock.module("@/application/usecases/updateInvoiceStatus", () => ({
  updateInvoiceStatus: async (input: unknown) => {
    state.updateInvoiceStatusCalls.push(input);
    return { ok: true as const, invoice: { ...mockInvoice, status: "paid" as const, paidAt: new Date() } };
  },
}));

mock.module("@/application/usecases/setRevenueTarget", () => ({
  setRevenueTarget: async (input: unknown) => {
    state.setRevenueTargetCalls.push(input);
    return { ok: true as const, target: { id: "target-1", organizationId: "org-1", periodStart: new Date(), periodEnd: new Date(), targetAmount: 1_000_000, createdAt: new Date(), updatedAt: new Date(), version: 1 } };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createContract", () => ({
    createContract: realCreateContract,
  }));
  mock.module("@/application/usecases/createInvoice", () => ({
    createInvoice: realCreateInvoice,
  }));
  mock.module("@/application/usecases/updateInvoiceStatus", () => ({
    updateInvoiceStatus: realUpdateInvoiceStatus,
  }));
  mock.module("@/application/usecases/setRevenueTarget", () => ({
    setRevenueTarget: realSetRevenueTarget,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerContractsTools } = await import("../../app/api/mcp/tools/contracts");
const { registerInvoicesTools } = await import("../../app/api/mcp/tools/invoices");
const { registerRevenueTargetsTools } = await import("../../app/api/mcp/tools/revenueTargets");

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const CONTRACT_UUID = "123e4567-e89b-12d3-a456-426614174002";
const INVOICE_UUID = "123e4567-e89b-12d3-a456-426614174003";

async function callTool(
  toolName: string,
  registerFn: (server: McpServer) => void,
  args: Record<string, unknown>,
  role: string,
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerFn(server);
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
      params: { name: toolName, arguments: args },
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
  state.createContractCalls = [];
  state.createInvoiceCalls = [];
  state.updateInvoiceStatusCalls = [];
  state.setRevenueTargetCalls = [];
});

describe("MCP 経理系ツール — finance / member 認可", () => {
  describe("contracts.create — contract.create 権限（admin / manager / finance）", () => {
    it("member ロールで contracts.create を呼ぶと isError:true で拒否され、createContract usecase に到達しない", async () => {
      const result = await callTool(
        "contracts",
        registerContractsTools,
        { operation: "create", dealId: DEAL_UUID, amount: 1_000_000, startDate: "2026-01-01" },
        "member"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      // usecase に到達していない
      expect(state.createContractCalls).toHaveLength(0);
    });

    it("finance ロールで contracts.create を呼ぶと認可チェックを通過し、createContract usecase に到達する", async () => {
      const result = await callTool(
        "contracts",
        registerContractsTools,
        { operation: "create", dealId: DEAL_UUID, amount: 1_000_000, startDate: "2026-01-01" },
        "finance"
      );

      // エラーなし（usecase が ok:true を返した）
      expect(result.isError).toBeUndefined();
      // usecase に到達した
      expect(state.createContractCalls).toHaveLength(1);
    });
  });

  describe("invoices.create — invoice.create 権限（admin / finance）", () => {
    it("member ロールで invoices.create を呼ぶと isError:true で拒否され、createInvoice usecase に到達しない", async () => {
      const result = await callTool(
        "invoices",
        registerInvoicesTools,
        {
          operation: "create",
          contractId: CONTRACT_UUID,
          title: "テスト請求",
          amount: 100_000,
          dueDate: "2026-03-31",
        },
        "member"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      // usecase に到達していない
      expect(state.createInvoiceCalls).toHaveLength(0);
    });
  });

  describe("invoices.update_status — invoice.changeStatus 権限（admin / finance）", () => {
    it("finance ロールで invoices.update_status を呼ぶと認可チェックを通過し、updateInvoiceStatus usecase に到達する", async () => {
      const result = await callTool(
        "invoices",
        registerInvoicesTools,
        { operation: "update_status", invoiceId: INVOICE_UUID, newStatus: "paid", paidAt: "2026-01-01" },
        "finance"
      );

      // エラーなし（usecase が ok:true を返した）
      expect(result.isError).toBeUndefined();
      // usecase に到達した
      expect(state.updateInvoiceStatusCalls).toHaveLength(1);
    });
  });

  describe("revenue_targets.set — revenue.setTarget 権限（admin / manager のみ）", () => {
    it("member ロールで revenue_targets.set を呼ぶと isError:true で拒否され、setRevenueTarget usecase に到達しない", async () => {
      const result = await callTool(
        "revenue_targets",
        registerRevenueTargetsTools,
        { operation: "set", periodStart: "2026-01-01", periodEnd: "2026-12-31", targetAmount: 10_000_000 },
        "member"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      // usecase に到達していない
      expect(state.setRevenueTargetCalls).toHaveLength(0);
    });

    it("finance ロールで revenue_targets.set を呼ぶと isError:true で拒否される（finance は revenue.setTarget 権限なし、admin / manager のみ）", async () => {
      const result = await callTool(
        "revenue_targets",
        registerRevenueTargetsTools,
        { operation: "set", periodStart: "2026-01-01", periodEnd: "2026-12-31", targetAmount: 10_000_000 },
        "finance"
      );

      expect(result.isError).toBe(true);
      expect(result.text).toContain("権限");
      // usecase に到達していない
      expect(state.setRevenueTargetCalls).toHaveLength(0);
    });
  });
});
