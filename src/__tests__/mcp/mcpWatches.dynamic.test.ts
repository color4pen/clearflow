/**
 * MCP watches ツールの実行検証テスト。
 *
 * T-09: ウォッチ重複が既存の一意性（inv-watch-unique）どおり扱われることを固定する。
 *  - 初回 watch は ok:true で成功する
 *  - 重複 watch は ok:false を返し、ツール結果が isError:true になる
 *
 * TC-015: ウォッチの解除（unwatch 正常系）
 *  - unwatch は unwatchDeal usecase に到達し、成功結果を返す
 *
 * 受け入れ基準:「ウォッチ重複が既存の一意性どおり扱われることをテストで固定する」を満たす。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Watch } from "@/domain/models/watch";

type WatchDealResult = { ok: true; watch: Watch } | { ok: false; reason: string };
type UnwatchDealResult = { ok: true } | { ok: false; reason: string };

const state = {
  watchDealCalls: [] as unknown[],
  watchDealReturns: null as WatchDealResult | null,
  unwatchDealCalls: [] as unknown[],
  unwatchDealReturns: null as UnwatchDealResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as watchDealModule from "@/application/usecases/watchDeal";
import * as unwatchDealModule from "@/application/usecases/unwatchDeal";
const realWatchDeal = watchDealModule.watchDeal;
const realUnwatchDeal = unwatchDealModule.unwatchDeal;

mock.module("@/application/usecases/watchDeal", () => ({
  watchDeal: async (input: unknown) => {
    state.watchDealCalls.push(input);
    return state.watchDealReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

mock.module("@/application/usecases/unwatchDeal", () => ({
  unwatchDeal: async (input: unknown) => {
    state.unwatchDealCalls.push(input);
    return state.unwatchDealReturns ?? { ok: false as const, reason: "mock not set" };
  },
}));

afterAll(() => {
  mock.module("@/application/usecases/watchDeal", () => ({
    watchDeal: realWatchDeal,
  }));
  mock.module("@/application/usecases/unwatchDeal", () => ({
    unwatchDeal: realUnwatchDeal,
  }));
});

// モック設定後に import する
const { registerWatchesTools } = await import("../../app/api/mcp/tools/watches");

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";

const mockWatch: Watch = {
  id: "watch-1",
  userId: "user-A",
  dealId: DEAL_UUID,
  organizationId: "org-1",
  createdAt: new Date("2026-01-01"),
};

async function callWatches(
  args: Record<string, unknown>,
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerWatchesTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: userId,
    scopes: [],
    extra: { userId, organizationId, role: "member" },
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
      params: { name: "watches", arguments: args },
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
  state.watchDealCalls = [];
  state.watchDealReturns = null;
  state.unwatchDealCalls = [];
  state.unwatchDealReturns = null;
});

describe("MCP watches ツール — ウォッチ重複（T-09）", () => {
  it("初回 watch は ok:true で成功し usecase が呼ばれる", async () => {
    state.watchDealReturns = { ok: true, watch: mockWatch };

    const result = await callWatches({
      operation: "watch",
      dealId: DEAL_UUID,
    });

    expect(result.isError).toBeUndefined();
    expect(state.watchDealCalls).toHaveLength(1);
    const callArgs = state.watchDealCalls[0] as Record<string, unknown>;
    expect(callArgs.dealId).toBe(DEAL_UUID);
    expect(callArgs.userId).toBe("user-A");
    expect(callArgs.organizationId).toBe("org-1");
  });

  it("重複 watch で usecase が ok:false を返すとき isError:true が返る（一意性制約）", async () => {
    state.watchDealReturns = {
      ok: false,
      reason: "既にウォッチ済みです",
    };

    const result = await callWatches({
      operation: "watch",
      dealId: DEAL_UUID,
    });

    expect(result.isError).toBe(true);
    // usecase は呼ばれた（canPerform はなく、usecase の返値がエラー）
    expect(state.watchDealCalls).toHaveLength(1);
  });
});

describe("TC-015: ウォッチの解除（unwatch 正常系）", () => {
  it("unwatch は unwatchDeal usecase に dealId / userId / organizationId を渡し、成功結果を返す", async () => {
    state.unwatchDealReturns = { ok: true };

    const result = await callWatches({
      operation: "unwatch",
      dealId: DEAL_UUID,
    });

    expect(result.isError).toBeUndefined();
    expect(state.unwatchDealCalls).toHaveLength(1);
    const callArgs = state.unwatchDealCalls[0] as Record<string, unknown>;
    expect(callArgs.dealId).toBe(DEAL_UUID);
    expect(callArgs.userId).toBe("user-A");
    expect(callArgs.organizationId).toBe("org-1");
    // 成功レスポンスに unwatched: true と dealId が含まれる
    const parsed = JSON.parse(result.text) as Record<string, unknown>;
    expect(parsed.unwatched).toBe(true);
    expect(parsed.dealId).toBe(DEAL_UUID);
  });

  it("unwatch で usecase が ok:false を返すとき isError:true が返る", async () => {
    state.unwatchDealReturns = { ok: false, reason: "ウォッチが見つかりません" };

    const result = await callWatches({
      operation: "unwatch",
      dealId: DEAL_UUID,
    });

    expect(result.isError).toBe(true);
    expect(state.unwatchDealCalls).toHaveLength(1);
  });
});
