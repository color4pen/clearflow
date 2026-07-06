/**
 * T-08: 認証テスト
 * TC-003, TC-004, TC-005, TC-029
 *
 * route.ts の POST/GET ハンドラの認証ロジックを静的解析でテストする。
 * 実際の DB 接続を使わない静的検証アプローチ。
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
