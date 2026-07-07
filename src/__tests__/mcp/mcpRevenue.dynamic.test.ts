/**
 * MCP revenue ツールの実行検証テスト（T-11）。
 *
 * 受け入れ基準「売上サマリが人間の売上画面と同じ集計値を返すことをテストで固定する」を満たす。
 *
 * usecase をモック化した上で revenue ツールを実際に実行し:
 * - dashboard: getRevenueDashboard が organizationId（authInfo 由来）で呼ばれ、返した RevenueDashboard
 *   構造がそのままツール結果に含まれることを検証する（usecase 共有 = 同一集計値の保証）。
 * - details: getRevenueDetails が startDate / endDate / axis を正しく Date 変換して呼ばれることを検証する。
 * - forecast: getRevenueForecast が periodStart / periodEnd を正しく Date 変換して呼ばれることを検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { RevenueDashboard } from "@/application/usecases/getRevenueDashboard";
import type { RevenueDetailsResult } from "@/application/usecases/getRevenueDetails";
import type { RevenueForecastResult } from "@/application/usecases/getRevenueForecast";

const state = {
  getDashboardCalls: [] as unknown[],
  getDashboardReturns: null as RevenueDashboard | null,
  getDetailsCalls: [] as unknown[],
  getDetailsReturns: null as RevenueDetailsResult | null,
  getForecastCalls: [] as unknown[],
  getForecastReturns: null as RevenueForecastResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as getRevenueDashboardModule from "@/application/usecases/getRevenueDashboard";
import * as getRevenueDetailsModule from "@/application/usecases/getRevenueDetails";
import * as getRevenueForecastModule from "@/application/usecases/getRevenueForecast";
const realGetRevenueDashboard = getRevenueDashboardModule.getRevenueDashboard;
const realGetRevenueDetails = getRevenueDetailsModule.getRevenueDetails;
const realGetRevenueForecast = getRevenueForecastModule.getRevenueForecast;

mock.module("@/application/usecases/getRevenueDashboard", () => ({
  getRevenueDashboard: async (input: unknown) => {
    state.getDashboardCalls.push(input);
    return state.getDashboardReturns ?? {
      currentMonthRevenue: [],
      confirmedRevenue: 0,
      monthlyTrend: [],
      pipelineSummary: [],
      topCustomers: [],
    };
  },
}));

mock.module("@/application/usecases/getRevenueDetails", () => ({
  getRevenueDetails: async (input: unknown) => {
    state.getDetailsCalls.push(input);
    return state.getDetailsReturns ?? { axis: "monthly" as const, data: [] };
  },
}));

mock.module("@/application/usecases/getRevenueForecast", () => ({
  getRevenueForecast: async (input: unknown) => {
    state.getForecastCalls.push(input);
    return state.getForecastReturns ?? { items: [], pipelineTotal: 0 };
  },
}));

afterAll(() => {
  mock.module("@/application/usecases/getRevenueDashboard", () => ({
    getRevenueDashboard: realGetRevenueDashboard,
  }));
  mock.module("@/application/usecases/getRevenueDetails", () => ({
    getRevenueDetails: realGetRevenueDetails,
  }));
  mock.module("@/application/usecases/getRevenueForecast", () => ({
    getRevenueForecast: realGetRevenueForecast,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerRevenueTools } = await import("../../app/api/mcp/tools/revenue");

async function callRevenue(
  args: Record<string, unknown>,
  role = "admin",
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerRevenueTools(server);
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
      params: { name: "revenue", arguments: args },
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
  state.getDashboardCalls = [];
  state.getDashboardReturns = null;
  state.getDetailsCalls = [];
  state.getDetailsReturns = null;
  state.getForecastCalls = [];
  state.getForecastReturns = null;
});

const mockDashboard: RevenueDashboard = {
  currentMonthRevenue: [{ yearMonth: "2026-07", amount: 5_000_000, count: 2 }],
  confirmedRevenue: 5_000_000,
  monthlyTrend: [
    { yearMonth: "2026-06", amount: 3_000_000, count: 1 },
    { yearMonth: "2026-07", amount: 5_000_000, count: 2 },
  ],
  pipelineSummary: [{ phase: "proposal", dealCount: 3, estimatedAmount: 10_000_000 }],
  topCustomers: [{ clientId: "client-1", clientName: "テスト顧客", amount: 5_000_000, count: 2 }],
};

describe("MCP revenue ツール（T-11）", () => {
  describe("dashboard: getRevenueDashboard usecase 共有の検証", () => {
    it("dashboard operation は getRevenueDashboard usecase を organizationId（authInfo 由来）で呼び、返した RevenueDashboard がツール結果に含まれる", async () => {
      state.getDashboardReturns = mockDashboard;

      const result = await callRevenue({ operation: "dashboard" }, "admin", "user-A", "org-1");

      // ツール成功
      expect(result.isError).toBeUndefined();

      // usecase が organizationId で呼ばれた（authInfo 由来）
      expect(state.getDashboardCalls).toHaveLength(1);
      const callArgs = state.getDashboardCalls[0] as Record<string, unknown>;
      expect(callArgs.organizationId).toBe("org-1");

      // ツール結果に RevenueDashboard の構造が含まれる
      const parsed = JSON.parse(result.text) as Record<string, unknown>;
      expect(parsed.currentMonthRevenue).toBeDefined();
      expect(parsed.confirmedRevenue).toBe(5_000_000);
      expect(parsed.monthlyTrend).toBeDefined();
      expect(parsed.pipelineSummary).toBeDefined();
      expect(parsed.topCustomers).toBeDefined();
    });

    it("dashboard は引数なしで呼べる（usecase が当月・過去 12 ヶ月を自動計算）", async () => {
      const result = await callRevenue({ operation: "dashboard" });

      // ツール成功（エラーなし）
      expect(result.isError).toBeUndefined();
      expect(state.getDashboardCalls).toHaveLength(1);
    });
  });

  describe("details: getRevenueDetails usecase 呼び出しの検証", () => {
    it("details operation は startDate / endDate を Date に変換し、axis と共に getRevenueDetails usecase に渡す", async () => {
      state.getDetailsReturns = {
        axis: "customer",
        data: [{ clientId: "client-1", clientName: "テスト顧客", amount: 1_000_000, count: 1 }],
      };

      const result = await callRevenue({
        operation: "details",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        axis: "customer",
      });

      expect(result.isError).toBeUndefined();
      expect(state.getDetailsCalls).toHaveLength(1);
      const callArgs = state.getDetailsCalls[0] as Record<string, unknown>;

      // organizationId が authInfo 由来
      expect(callArgs.organizationId).toBe("org-1");
      // startDate / endDate が Date に変換されている
      expect(callArgs.startDate).toBeInstanceOf(Date);
      expect(callArgs.endDate).toBeInstanceOf(Date);
      expect((callArgs.startDate as Date).toISOString().startsWith("2026-01-01")).toBe(true);
      expect((callArgs.endDate as Date).toISOString().startsWith("2026-06-30")).toBe(true);
      // axis が正しく渡されている
      expect(callArgs.axis).toBe("customer");
    });
  });

  describe("forecast: getRevenueForecast usecase 呼び出しの検証", () => {
    it("forecast operation は periodStart / periodEnd を Date に変換して getRevenueForecast usecase に渡す", async () => {
      state.getForecastReturns = {
        items: [],
        pipelineTotal: 15_000_000,
      };

      const result = await callRevenue({
        operation: "forecast",
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
      });

      expect(result.isError).toBeUndefined();
      expect(state.getForecastCalls).toHaveLength(1);
      const callArgs = state.getForecastCalls[0] as Record<string, unknown>;

      // organizationId が authInfo 由来
      expect(callArgs.organizationId).toBe("org-1");
      // periodStart / periodEnd が Date に変換されている
      expect(callArgs.periodStart).toBeInstanceOf(Date);
      expect(callArgs.periodEnd).toBeInstanceOf(Date);
      expect((callArgs.periodStart as Date).toISOString().startsWith("2026-01-01")).toBe(true);
      expect((callArgs.periodEnd as Date).toISOString().startsWith("2026-12-31")).toBe(true);
    });
  });
});
