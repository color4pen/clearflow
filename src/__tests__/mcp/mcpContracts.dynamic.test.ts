/**
 * MCP contracts ツールの実行検証テスト。
 *
 * T-06: won でない案件への契約作成が拒否されることをテストで固定する。
 *       createContract usecase が { ok: false, reason: "受注済みの案件にのみ契約を作成できます" } を
 *       返すとき、ツール結果が isError: true になることを検証する。
 *
 * T-10: version 不一致の更新が衝突エラーになることをテストで固定する。
 *       updateContract が version 不一致 reason を返すとき、ツール結果が isError: true になる。
 *
 * T-13: エラー変換で内部詳細を漏らさないことをテストで固定する。
 *       usecase catch ブロックが固定文言 { ok: false, reason: "契約の作成に失敗しました" } を
 *       返すとき、ツール結果が isError: true で DB エラー詳細が含まれないことを検証する。
 *
 * TC-038: contracts update の null vs undefined 区別を実行検証で固定する。
 *         endDate: null と contractType 省略で update を呼んだとき、
 *         usecase 引数の endDate === null かつ contractType === undefined であることを検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Contract } from "@/domain/models/contract";

type CreateContractResult = { ok: true; contract: Contract } | { ok: false; reason: string };
type UpdateContractResult = { ok: true; contract: Contract } | { ok: false; reason: string };

const state = {
  createContractCalls: [] as unknown[],
  createContractReturns: null as CreateContractResult | null,
  updateContractCalls: [] as unknown[],
  updateContractReturns: null as UpdateContractResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createContractModule from "@/application/usecases/createContract";
import * as updateContractModule from "@/application/usecases/updateContract";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateContract = createContractModule.createContract;
const realUpdateContract = updateContractModule.updateContract;

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
    return state.createContractReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

mock.module("@/application/usecases/updateContract", () => ({
  updateContract: async (input: unknown) => {
    state.updateContractCalls.push(input);
    return state.updateContractReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createContract", () => ({
    createContract: realCreateContract,
  }));
  mock.module("@/application/usecases/updateContract", () => ({
    updateContract: realUpdateContract,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerContractsTools } = await import("../../app/api/mcp/tools/contracts");

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const CONTRACT_UUID = "123e4567-e89b-12d3-a456-426614174002";

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
  state.createContractCalls = [];
  state.createContractReturns = null;
  state.updateContractCalls = [];
  state.updateContractReturns = null;
});

describe("MCP contracts ツール", () => {
  describe("T-06: won でない案件への契約作成が拒否される", () => {
    it("createContract が ok:false（won でない）を返すとき、ツール結果が isError:true になりメッセージが含まれる", async () => {
      state.createContractReturns = {
        ok: false,
        reason: "受注済みの案件にのみ契約を作成できます",
      };

      const result = await callContracts({
        operation: "create",
        dealId: DEAL_UUID,
        amount: 1_000_000,
        startDate: "2026-01-01",
      });

      expect(result.isError).toBe(true);
      expect(result.text).toContain("受注済みの案件にのみ契約を作成できます");
      // createContract usecase に到達した
      expect(state.createContractCalls).toHaveLength(1);
    });
  });

  describe("T-10: version 不一致の更新が衝突エラーになる（contracts）", () => {
    it("updateContract が version 不一致 reason を返すとき、ツール結果が isError:true になる", async () => {
      state.updateContractReturns = {
        ok: false,
        reason: "この契約は他のユーザーによって更新されました。画面を更新してください",
      };

      const result = await callContracts({
        operation: "update",
        contractId: CONTRACT_UUID,
        title: "更新後のタイトル",
      });

      expect(result.isError).toBe(true);
      expect(result.text).toContain("この契約は他のユーザーによって更新されました");
      // updateContract usecase に到達した
      expect(state.updateContractCalls).toHaveLength(1);
    });
  });

  describe("T-13: エラー変換で内部詳細を漏らさない（contracts）", () => {
    it("usecase が固定文言 ok:false を返すとき、DB エラー詳細はクライアントに渡らない", async () => {
      // usecase の catch ブロックが DB 例外を固定文言に変換した後の状態をシミュレート
      state.createContractReturns = {
        ok: false,
        reason: "契約の作成に失敗しました",
      };

      const result = await callContracts({
        operation: "create",
        dealId: DEAL_UUID,
        amount: 1_000_000,
        startDate: "2026-01-01",
      });

      expect(result.isError).toBe(true);
      // DB エラー詳細が含まれない
      expect(result.text).not.toContain("duplicate key value violates unique constraint");
      // 固定文言がそのまま返る（toToolError(result.reason) の動作）
      expect(result.text).toBe("契約の作成に失敗しました");
      expect(state.createContractCalls).toHaveLength(1);
    });
  });

  describe("TC-038: contracts update の null vs undefined 区別", () => {
    it("endDate: null と contractType 省略で update を呼ぶと、usecase 引数の endDate === null かつ contractType === undefined になる", async () => {
      state.updateContractReturns = { ok: false as const, reason: "mock" };

      await callContracts({
        operation: "update",
        contractId: CONTRACT_UUID,
        endDate: null,
        // contractType は省略（変更なし）
      });

      expect(state.updateContractCalls).toHaveLength(1);
      const callArgs = state.updateContractCalls[0] as Record<string, unknown>;
      // null（クリア）と undefined（変更なし）が正しく区別される
      expect(callArgs.endDate).toBeNull();
      expect(callArgs.contractType).toBeUndefined();
    });
  });
});
