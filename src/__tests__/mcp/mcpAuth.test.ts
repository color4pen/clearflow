/**
 * T-08: 認証テスト
 * TC-003, TC-004, TC-005, TC-029
 *
 * TC-003 / TC-004: POST ハンドラを直接 import して runtime テストを実施する。
 * DB 接続不要（無認証・無効トークンは resolveBearer の早期 return で 401 を返すため）。
 * TC-005 / TC-029 など追加の静的検証も含む。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("MCP route handler 認証テスト（静的検証）", () => {
  describe("TC-003 / TC-004 / TC-005 / TC-029: 無認証・無効トークンが 401 を返す", () => {
    it("route.ts が Authorization ヘッダを取得している", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain('request.headers.get("Authorization")');
    });

    it("route.ts が resolveBearer を呼び出している", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("resolveBearer");
    });

    it("resolveBearer が null の場合に 401 を返すコードが含まれる", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("401");
      expect(content).toContain("Unauthorized");
    });

    it("resolveBearer は @/infrastructure/apiTokenResolver から import されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("@/infrastructure/apiTokenResolver");
    });

    it("apiTokenResolver.ts が hasApiTokenPrefix でプレフィックスを検証している", async () => {
      const content = await readSrc("infrastructure/apiTokenResolver.ts");
      expect(content).toContain("hasApiTokenPrefix");
    });

    it("apiTokenResolver.ts が revokedAt を検査している（失効済みトークンの検査）", async () => {
      const content = await readSrc("infrastructure/apiTokenResolver.ts");
      expect(content).toContain("revokedAt");
    });

    it("apiTokenResolver.ts が deactivatedAt を検査している（無効化ユーザーの検査）", async () => {
      const content = await readSrc("infrastructure/apiTokenResolver.ts");
      expect(content).toContain("deactivatedAt");
    });
  });

  describe("認証成功後の authInfo 設定", () => {
    it("route.ts が authInfo を transport.handleRequest に渡している", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("authInfo");
      expect(content).toContain("handleRequest");
    });

    it("route.ts が userId, organizationId, role を extra に格納している", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("userId");
      expect(content).toContain("organizationId");
      expect(content).toContain("role");
    });
  });
});

/**
 * TC-003 / TC-004: POST ハンドラ runtime テスト
 *
 * resolveBearer は Authorization ヘッダが null のとき（TC-003）、
 * および cfp_ プレフィックスのないトークンのとき（TC-004）に
 * DB アクセスなしで null を返す。そのため実 DB 接続不要で検証できる。
 */
describe("TC-003 / TC-004: POST ハンドラ runtime 認証テスト", () => {
  const initializeBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "0.1.0" },
    },
  });

  it("TC-003: Authorization ヘッダなし → 401 Unauthorized", async () => {
    const { POST } = await import("../../app/api/mcp/route");
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: initializeBody,
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("TC-004: cfp_ プレフィックスなしトークン → 401 Unauthorized", async () => {
    const { POST } = await import("../../app/api/mcp/route");
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid_token_without_cfp_prefix",
      },
      body: initializeBody,
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("TC-024: GET ハンドラが認証なしで 401 を返す", async () => {
    const { GET } = await import("../../app/api/mcp/route");
    const request = new Request("http://localhost/api/mcp", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });
});
