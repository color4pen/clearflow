/**
 * MCP revenue_targets ツールの update 成功シナリオ実行検証テスト。
 *
 * TC-023: revenue_targets update 成功シナリオ。
 *         updateRevenueTarget usecase が ok:true を返すとき、
 *         ツール結果が isError なしで target データを含むことを検証する。
 *         id と省略フィールドが usecase に正しく伝播することも検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

type UpdateRevenueTargetResult =
  | { ok: true; target: RevenueTarget }
  | { ok: false; reason: string };

const state = {
  updateRevenueTargetCalls: [] as unknown[],
  updateRevenueTargetReturns: null as UpdateRevenueTargetResult | null,
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as updateRevenueTargetModule from "@/application/usecases/updateRevenueTarget";
const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realUpdateRevenueTarget = updateRevenueTargetModule.updateRevenueTarget;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/updateRevenueTarget", () => ({
  updateRevenueTarget: async (input: unknown) => {
    state.updateRevenueTargetCalls.push(input);
    return (
      state.updateRevenueTargetReturns ?? { ok: false as const, reason: "mock not set" }
    );
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/updateRevenueTarget", () => ({
    updateRevenueTarget: realUpdateRevenueTarget,
  }));
});

// モック設定後に import する（モック済みバージョンが使われる）
const { registerRevenueTargetsTools } = await import(
  "../../app/api/mcp/tools/revenueTargets"
);

const TARGET_UUID = "123e4567-e89b-12d3-a456-426614174010";

const mockTarget: RevenueTarget = {
  id: TARGET_UUID,
  organizationId: "org-1",
  periodStart: new Date("2026-01-01"),
  periodEnd: new Date("2026-12-31"),
  targetAmount: 12_000_000,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-07-01"),
  version: 2,
};

async function callRevenueTargets(
  args: Record<string, unknown>,
  role = "admin",
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerRevenueTargetsTools(server);
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
      params: { name: "revenue_targets", arguments: args },
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
  state.updateRevenueTargetCalls = [];
  state.updateRevenueTargetReturns = null;
});

describe("MCP revenue_targets ツール update 成功シナリオ", () => {
  describe("TC-023: revenue_targets update 成功", () => {
    it("targetAmount のみ指定して update を呼んで updateRevenueTarget が ok:true を返すとき、ツール結果が isError なしで target データを含む", async () => {
      state.updateRevenueTargetReturns = { ok: true, target: mockTarget };

      const result = await callRevenueTargets({
        operation: "update",
        id: TARGET_UUID,
        targetAmount: 15_000_000,
        // periodStart / periodEnd は省略（変更なし）
      });

      expect(result.isError).toBeUndefined();
      // updateRevenueTarget usecase に到達した
      expect(state.updateRevenueTargetCalls).toHaveLength(1);
      const callArgs = state.updateRevenueTargetCalls[0] as Record<string, unknown>;
      expect(callArgs.id).toBe(TARGET_UUID);
      expect(callArgs.targetAmount).toBe(15_000_000);
      // 省略フィールドは undefined（変更なし）として渡される
      expect(callArgs.periodStart).toBeUndefined();
      expect(callArgs.periodEnd).toBeUndefined();
      // organizationId は authInfo から伝播する
      expect(callArgs.organizationId).toBe("org-1");
      // レスポンスに target データが含まれる
      expect(result.text).toContain(TARGET_UUID);
    });
  });
});
