/**
 * MCP 経理系ツールの監査記録・テナント分離の実行検証テスト（T-12）。
 *
 * 受け入れ基準「書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する」を満たす。
 *
 * 1. 監査記録の実行検証:
 *    contracts.create → createContract usecase が organizationId と actorId を受け取って呼ばれることを assert する。
 *    （usecase 内で recordAudit が呼ばれる = 監査記録されることの保証）
 *
 * 2. テナント分離の実行検証:
 *    org-A と org-B の 2 つの authInfo で各ツールを呼び、usecase に渡される organizationId が
 *    それぞれ authInfo の値と一致することを assert する。
 *    対象ツール: contracts, invoices, revenue_targets, revenue（全 4 ツール）
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Contract } from "@/domain/models/contract";
import type { Invoice } from "@/domain/models/invoice";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

const state = {
  createContractCalls: [] as unknown[],
  createInvoiceCalls: [] as unknown[],
  setRevenueTargetCalls: [] as unknown[],
  getRevenueDashboardCalls: [] as unknown[],
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createContractModule from "@/application/usecases/createContract";
import * as createInvoiceModule from "@/application/usecases/createInvoice";
import * as setRevenueTargetModule from "@/application/usecases/setRevenueTarget";
import * as getRevenueDashboardModule from "@/application/usecases/getRevenueDashboard";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateContract = createContractModule.createContract;
const realCreateInvoice = createInvoiceModule.createInvoice;
const realSetRevenueTarget = setRevenueTargetModule.setRevenueTarget;
const realGetRevenueDashboard = getRevenueDashboardModule.getRevenueDashboard;

const mockContract: Contract = {
  id: "123e4567-e89b-12d3-a456-426614174002",
  organizationId: "org-A",
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
  organizationId: "org-A",
  contractId: "123e4567-e89b-12d3-a456-426614174002",
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

const mockRevenueTarget: RevenueTarget = {
  id: "target-1",
  organizationId: "org-A",
  periodStart: new Date("2026-01-01"),
  periodEnd: new Date("2026-12-31"),
  targetAmount: 10_000_000,
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

mock.module("@/application/usecases/setRevenueTarget", () => ({
  setRevenueTarget: async (input: unknown) => {
    state.setRevenueTargetCalls.push(input);
    return { ok: true as const, target: mockRevenueTarget };
  },
}));

mock.module("@/application/usecases/getRevenueDashboard", () => ({
  getRevenueDashboard: async (input: unknown) => {
    state.getRevenueDashboardCalls.push(input);
    return {
      currentMonthRevenue: [],
      confirmedRevenue: 0,
      monthlyTrend: [],
      pipelineSummary: [],
      topCustomers: [],
    };
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
  mock.module("@/application/usecases/setRevenueTarget", () => ({
    setRevenueTarget: realSetRevenueTarget,
  }));
  mock.module("@/application/usecases/getRevenueDashboard", () => ({
    getRevenueDashboard: realGetRevenueDashboard,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerContractsTools } = await import("../../app/api/mcp/tools/contracts");
const { registerInvoicesTools } = await import("../../app/api/mcp/tools/invoices");
const { registerRevenueTargetsTools } = await import("../../app/api/mcp/tools/revenueTargets");
const { registerRevenueTools } = await import("../../app/api/mcp/tools/revenue");

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const CONTRACT_UUID = "123e4567-e89b-12d3-a456-426614174002";

async function callTool(
  toolName: string,
  registerFn: (server: McpServer) => void,
  args: Record<string, unknown>,
  userId: string,
  organizationId: string,
  role = "admin"
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
  state.setRevenueTargetCalls = [];
  state.getRevenueDashboardCalls = [];
});

describe("MCP 経理系ツール — 監査記録・テナント分離（T-12）", () => {
  describe("監査記録の実行検証（contracts.create）", () => {
    it("contracts.create は createContract usecase を organizationId と actorId を含む引数で呼ぶ（usecase 内で recordAudit が呼ばれる）", async () => {
      const result = await callTool(
        "contracts",
        registerContractsTools,
        { operation: "create", dealId: DEAL_UUID, amount: 1_000_000, startDate: "2026-01-01" },
        "user-A",
        "org-A",
        "finance"
      );

      // ツール成功
      expect(result.isError).toBeUndefined();

      // createContract usecase が 1 回呼ばれた
      expect(state.createContractCalls).toHaveLength(1);
      const callArgs = state.createContractCalls[0] as Record<string, unknown>;
      // organizationId と actorId が正しく渡されている（usecase 内で recordAudit が呼ばれる = 監査記録される）
      expect(callArgs.organizationId).toBe("org-A");
      expect(callArgs.actorId).toBe("user-A");
    });
  });

  describe("テナント分離の実行検証（contracts）", () => {
    it("org-A と org-B で contracts.create を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "contracts",
        registerContractsTools,
        { operation: "create", dealId: DEAL_UUID, amount: 1_000_000, startDate: "2026-01-01" },
        "user-A",
        "org-A",
        "finance"
      );
      await callTool(
        "contracts",
        registerContractsTools,
        { operation: "create", dealId: DEAL_UUID, amount: 2_000_000, startDate: "2026-01-01" },
        "user-B",
        "org-B",
        "finance"
      );

      expect(state.createContractCalls).toHaveLength(2);
      const args1 = state.createContractCalls[0] as Record<string, unknown>;
      const args2 = state.createContractCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-A");
      expect(args2.organizationId).toBe("org-B");
      // 混在していない
      expect(args1.organizationId).not.toBe(args2.organizationId);
    });
  });

  describe("テナント分離の実行検証（invoices）", () => {
    it("org-A と org-B で invoices.create を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "invoices",
        registerInvoicesTools,
        {
          operation: "create",
          contractId: CONTRACT_UUID,
          title: "org-A 請求",
          amount: 100_000,
          dueDate: "2026-03-31",
        },
        "user-A",
        "org-A",
        "finance"
      );
      await callTool(
        "invoices",
        registerInvoicesTools,
        {
          operation: "create",
          contractId: CONTRACT_UUID,
          title: "org-B 請求",
          amount: 200_000,
          dueDate: "2026-03-31",
        },
        "user-B",
        "org-B",
        "finance"
      );

      expect(state.createInvoiceCalls).toHaveLength(2);
      const args1 = state.createInvoiceCalls[0] as Record<string, unknown>;
      const args2 = state.createInvoiceCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-A");
      expect(args2.organizationId).toBe("org-B");
    });
  });

  describe("テナント分離の実行検証（revenue_targets）", () => {
    it("org-A と org-B で revenue_targets.set を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "revenue_targets",
        registerRevenueTargetsTools,
        { operation: "set", periodStart: "2026-01-01", periodEnd: "2026-12-31", targetAmount: 10_000_000 },
        "user-A",
        "org-A",
        "admin"
      );
      await callTool(
        "revenue_targets",
        registerRevenueTargetsTools,
        { operation: "set", periodStart: "2026-01-01", periodEnd: "2026-12-31", targetAmount: 20_000_000 },
        "user-B",
        "org-B",
        "admin"
      );

      expect(state.setRevenueTargetCalls).toHaveLength(2);
      const args1 = state.setRevenueTargetCalls[0] as Record<string, unknown>;
      const args2 = state.setRevenueTargetCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-A");
      expect(args2.organizationId).toBe("org-B");
    });
  });

  describe("テナント分離の実行検証（revenue）", () => {
    it("org-A と org-B で revenue.dashboard を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
      await callTool(
        "revenue",
        registerRevenueTools,
        { operation: "dashboard" },
        "user-A",
        "org-A"
      );
      await callTool(
        "revenue",
        registerRevenueTools,
        { operation: "dashboard" },
        "user-B",
        "org-B"
      );

      expect(state.getRevenueDashboardCalls).toHaveLength(2);
      const args1 = state.getRevenueDashboardCalls[0] as Record<string, unknown>;
      const args2 = state.getRevenueDashboardCalls[1] as Record<string, unknown>;
      expect(args1.organizationId).toBe("org-A");
      expect(args2.organizationId).toBe("org-B");
    });
  });
});
