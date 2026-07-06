/**
 * Bearer 解決関数 (apiTokenResolver) の静的解析テスト
 *
 * resolveBearer の実装ソースに必要な検査ステップが含まれていることを
 * 静的解析で確認する。
 */

import { describe, it, expect } from "bun:test";
import { readFile } from "fs/promises";
import path from "path";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("apiTokenResolver — 静的構造検証", () => {
  it('resolveBearer のソースに "Bearer " prefix チェックが含まれる', async () => {
    const content = await readSrc("infrastructure/apiTokenResolver.ts");
    expect(content).toContain("Bearer ");
  });

  it('resolveBearer のソースに "cfp_" prefix チェックが含まれる', async () => {
    const content = await readSrc("infrastructure/apiTokenResolver.ts");
    expect(content).toContain("cfp_");
  });

  it('resolveBearer のソースに createHash("sha256") または createHash(\'sha256\') が含まれる', async () => {
    const content = await readSrc("infrastructure/apiTokenResolver.ts");
    const hasSha256 =
      content.includes('createHash("sha256")') ||
      content.includes("createHash('sha256')");
    expect(hasSha256).toBe(true);
  });

  it("resolveBearer のソースに revokedAt と expiresAt の検査が含まれる", async () => {
    const content = await readSrc("infrastructure/apiTokenResolver.ts");
    expect(content).toContain("revokedAt");
    expect(content).toContain("expiresAt");
  });

  it("resolveBearer のソースに deactivatedAt の検査が含まれる", async () => {
    const content = await readSrc("infrastructure/apiTokenResolver.ts");
    expect(content).toContain("deactivatedAt");
  });

  it("resolveBearer のソースに updateLastUsedAt の呼び出しが含まれる", async () => {
    const content = await readSrc("infrastructure/apiTokenResolver.ts");
    expect(content).toContain("updateLastUsedAt");
  });
});
