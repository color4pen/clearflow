/**
 * MCP contracts ツールの基本 CRUD 成功シナリオ実行検証テスト。
 *
 * TC-001: 契約一覧取得（list）が正常に動作する。
 *         listContracts usecase が呼ばれ organizationId が authInfo から伝播すること、
 *         ツール結果が isError なしで contracts データを含むことを検証する。
 *
 * TC-002: 契約詳細取得（get）が正常に動作する。
 *         getContract usecase が contractId と organizationId を受け取り、
 *         ツール結果が isError なしで contract データを含むことを検証する。
 *
 * TC-005: 契約ステータス更新（update_status）成功シナリオ。
 *         updateContractStatus usecase が ok:true を返すとき、
 *         ツール結果が isError なしで contract データを含むことを検証する。
 *
 * TC-006: 契約削除（delete）成功シナリオ。
 *         deleteContract usecase が ok:true を返すとき、
 *         ツール結果が isError なしで deleted:true を含むことを検証する。
 *
 * TC-007: contracts 部分更新（title のみ）成功シナリオ。
 *         title のみ指定して update を呼んだとき updateContract が ok:true を返し、
 *         ツール結果が isError なしで contract データを含むことを検証する。
 *
 * TC-027: organizationId がスキーマに含まれない。
 *         organizationId は authInfo からのみ取得され、usecase に正しく伝播する。
 *         ツール引数に organizationId が含まれていなくても正常に動作することを検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Contract, ContractWithClient } from "@/domain/models/contract";

type UpdateContractResult = { ok: true; contract: Contract } | { ok: false; reason: string };
type UpdateContractStatusResult = { ok: true; contract: Contract } | { ok: false; reason: string };
type DeleteContractResult = { ok: true } | { ok: false; reason: string };

const state = {
  listContractsCalls: [] as unknown[],
  listContractsReturns: null as ContractWithClient[] | null,
  getContractCalls: [] as unknown[],
  getContractReturns: null as Contract | null | undefined,
  updateContractCalls: [] as unknown[],
  updateContractReturns: null as UpdateContractResult | null,
  updateContractStatusCalls: [] as unknown[],
  updateContractStatusReturns: null as UpdateContractStatusResult | null,
  deleteContractCalls: [] as unknown[],
  deleteContractReturns: null as DeleteContractResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as listContractsModule from "@/application/usecases/listContracts";
import * as getContractModule from "@/application/usecases/getContract";
import * as updateContractModule from "@/application/usecases/updateContract";
import * as updateContractStatusModule from "@/application/usecases/updateContractStatus";
import * as deleteContractModule from "@/application/usecases/deleteContract";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realListContracts = listContractsModule.listContracts;
const realGetContract = getContractModule.getContract;
const realUpdateContract = updateContractModule.updateContract;
const realUpdateContractStatus = updateContractStatusModule.updateContractStatus;
const realDeleteContract = deleteContractModule.deleteContract;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/listContracts", () => ({
  listContracts: async (input: unknown) => {
    state.listContractsCalls.push(input);
    return state.listContractsReturns ?? [];
  },
}));

mock.module("@/application/usecases/getContract", () => ({
  getContract: async (input: unknown) => {
    state.getContractCalls.push(input);
    return state.getContractReturns ?? null;
  },
}));

mock.module("@/application/usecases/updateContract", () => ({
  updateContract: async (input: unknown) => {
    state.updateContractCalls.push(input);
    return state.updateContractReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

mock.module("@/application/usecases/updateContractStatus", () => ({
  updateContractStatus: async (input: unknown) => {
    state.updateContractStatusCalls.push(input);
    return (
      state.updateContractStatusReturns ?? { ok: false as const, reason: "mock not set" }
    );
  },
}));

mock.module("@/application/usecases/deleteContract", () => ({
  deleteContract: async (input: unknown) => {
    state.deleteContractCalls.push(input);
    return state.deleteContractReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/listContracts", () => ({
    listContracts: realListContracts,
  }));
  mock.module("@/application/usecases/getContract", () => ({
    getContract: realGetContract,
  }));
  mock.module("@/application/usecases/updateContract", () => ({
    updateContract: realUpdateContract,
  }));
  mock.module("@/application/usecases/updateContractStatus", () => ({
    updateContractStatus: realUpdateContractStatus,
  }));
  mock.module("@/application/usecases/deleteContract", () => ({
    deleteContract: realDeleteContract,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerContractsTools } = await import("../../app/api/mcp/tools/contracts");

const CONTRACT_UUID = "123e4567-e89b-12d3-a456-426614174002";
const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";

const mockContract: Contract = {
  id: CONTRACT_UUID,
  organizationId: "org-1",
  dealId: DEAL_UUID,
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

const mockContractWithClient: ContractWithClient = {
  ...mockContract,
  clientName: "テストクライアント",
  dealTitle: "テスト案件",
};

async function callContracts(
  args: Record<string, unknown>,
  role = "finance",
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerContractsTools(server);
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
      params: { name: "contracts", arguments: args },
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
  state.listContractsCalls = [];
  state.listContractsReturns = null;
  state.getContractCalls = [];
  state.getContractReturns = undefined;
  state.updateContractCalls = [];
  state.updateContractReturns = null;
  state.updateContractStatusCalls = [];
  state.updateContractStatusReturns = null;
  state.deleteContractCalls = [];
  state.deleteContractReturns = null;
});

describe("MCP contracts ツール 基本 CRUD 成功シナリオ", () => {
  describe("TC-001: 契約一覧取得（list）", () => {
    it("list を呼ぶと listContracts usecase が実行され、ツール結果が isError なしで contracts データを含む", async () => {
      state.listContractsReturns = [mockContractWithClient];

      const result = await callContracts({ operation: "list" });

      expect(result.isError).toBeUndefined();
      // listContracts usecase に到達した
      expect(state.listContractsCalls).toHaveLength(1);
      // レスポンスに契約データが含まれる
      const parsed = JSON.parse(result.text) as unknown[];
      expect(parsed).toHaveLength(1);
    });
  });

  describe("TC-002: 契約詳細取得（get）", () => {
    it("get を contractId 付きで呼ぶと getContract usecase が実行され、ツール結果が isError なしで contract データを含む", async () => {
      state.getContractReturns = mockContract;

      const result = await callContracts({
        operation: "get",
        contractId: CONTRACT_UUID,
      });

      expect(result.isError).toBeUndefined();
      // getContract usecase に到達した
      expect(state.getContractCalls).toHaveLength(1);
      const callArgs = state.getContractCalls[0] as Record<string, unknown>;
      expect(callArgs.contractId).toBe(CONTRACT_UUID);
      // レスポンスに契約 ID が含まれる
      expect(result.text).toContain(CONTRACT_UUID);
    });
  });

  describe("TC-005: 契約ステータス更新（update_status）成功", () => {
    it("update_status を呼んで updateContractStatus が ok:true を返すとき、ツール結果が isError なしで contract データを含む", async () => {
      state.updateContractStatusReturns = { ok: true, contract: mockContract };

      const result = await callContracts({
        operation: "update_status",
        contractId: CONTRACT_UUID,
        newStatus: "completed",
      });

      expect(result.isError).toBeUndefined();
      // updateContractStatus usecase に到達した
      expect(state.updateContractStatusCalls).toHaveLength(1);
      const callArgs = state.updateContractStatusCalls[0] as Record<string, unknown>;
      expect(callArgs.contractId).toBe(CONTRACT_UUID);
      expect(callArgs.newStatus).toBe("completed");
    });
  });

  describe("TC-006: 契約削除（delete）成功", () => {
    it("delete を呼んで deleteContract が ok:true を返すとき、ツール結果が isError なしで deleted:true を含む", async () => {
      state.deleteContractReturns = { ok: true };

      // delete は admin のみ許可（ADMIN_ONLY）
      const result = await callContracts(
        { operation: "delete", contractId: CONTRACT_UUID },
        "admin"
      );

      expect(result.isError).toBeUndefined();
      // deleteContract usecase に到達した
      expect(state.deleteContractCalls).toHaveLength(1);
      const callArgs = state.deleteContractCalls[0] as Record<string, unknown>;
      expect(callArgs.id).toBe(CONTRACT_UUID);
      // レスポンスに deleted:true が含まれる
      const parsed = JSON.parse(result.text) as Record<string, unknown>;
      expect(parsed.deleted).toBe(true);
      expect(parsed.contractId).toBe(CONTRACT_UUID);
    });
  });

  describe("TC-007: contracts 部分更新（title のみ）成功", () => {
    it("title のみ指定して update を呼んで updateContract が ok:true を返すとき、ツール結果が isError なしで contract データを含む", async () => {
      state.updateContractReturns = { ok: true, contract: mockContract };

      const result = await callContracts({
        operation: "update",
        contractId: CONTRACT_UUID,
        title: "新しいタイトル",
        // 他のフィールドはすべて省略（部分更新）
      });

      expect(result.isError).toBeUndefined();
      // updateContract usecase に到達した
      expect(state.updateContractCalls).toHaveLength(1);
      const callArgs = state.updateContractCalls[0] as Record<string, unknown>;
      expect(callArgs.contractId).toBe(CONTRACT_UUID);
      expect(callArgs.title).toBe("新しいタイトル");
      // 省略フィールドは undefined（変更なし）として渡される
      expect(callArgs.endDate).toBeUndefined();
      expect(callArgs.amount).toBeUndefined();
    });
  });

  describe("TC-027: organizationId がスキーマに含まれない", () => {
    it("ツール引数に organizationId を渡さなくても、authInfo の organizationId が usecase に正しく伝播する", async () => {
      state.listContractsReturns = [];

      // organizationId はツール引数ではなく authInfo から取得される
      await callContracts({ operation: "list" }, "finance", "user-A", "org-from-auth");

      expect(state.listContractsCalls).toHaveLength(1);
      // listContracts の第1引数が authInfo の organizationId
      const callArg = state.listContractsCalls[0] as string;
      expect(callArg).toBe("org-from-auth");
    });
  });
});
