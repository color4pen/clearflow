/**
 * MCP route のリクエストライフサイクル動的テスト。
 * resolveBearer をモックして認証を通し、実 POST ハンドラを複数回呼ぶ。
 *
 * 回帰ガード: McpServer をモジュールレベルで使い回すと 2 リクエスト目で
 * "Already connected to a transport" により 500 になる。リクエストごとに
 * サーバー/トランスポートを生成していることを、連続 2 リクエストの成功で固定する。
 */

import { describe, it, expect, mock, afterAll } from "bun:test";

// 実装を捕捉して afterAll で復元し、他テストファイル（実 resolveBearer を検証する
// apiTokenResolver.dynamic / mcpAuth）へのモック汚染を防ぐ。
import * as resolverModule from "@/infrastructure/apiTokenResolver";
const realResolveBearer = resolverModule.resolveBearer;

mock.module("@/infrastructure/apiTokenResolver", () => ({
  resolveBearer: async (header: string | null) =>
    header === "Bearer cfp_valid"
      ? { userId: "user-1", organizationId: "org-1", role: "admin" }
      : null,
}));

afterAll(() => {
  mock.module("@/infrastructure/apiTokenResolver", () => ({
    resolveBearer: realResolveBearer,
  }));
});

const { POST } = await import("../../app/api/mcp/route");

function initializeRequest(): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: "Bearer cfp_valid",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.1.0" },
      },
    }),
  });
}

describe("MCP route ライフサイクル", () => {
  it("連続 2 リクエストがどちらも 500 にならない（singleton 再接続の回帰ガード）", async () => {
    const first = await POST(initializeRequest());
    expect(first.status).not.toBe(500);

    const second = await POST(initializeRequest());
    expect(second.status).not.toBe(500);

    // 3 回目も安定していることを確認する
    const third = await POST(initializeRequest());
    expect(third.status).not.toBe(500);
  });

  it("initialize が JSON-RPC result を返す（プロトコル疎通）", async () => {
    const response = await POST(initializeRequest());
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result?: { serverInfo?: { name?: string } };
      error?: unknown;
    };
    expect(body.error).toBeUndefined();
    expect(body.result?.serverInfo?.name).toBe("clearflow");
  });
});
