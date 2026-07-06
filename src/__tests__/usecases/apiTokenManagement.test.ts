/**
 * API トークン発行・失効ユースケースの静的解析テスト
 *
 * createApiToken / revokeApiToken のソースに必要な実装要素が含まれていることを確認する。
 */

import { describe, it, expect } from "bun:test";
import { readFile } from "fs/promises";
import path from "path";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("createApiToken — 静的構造検証", () => {
  it("createApiToken のソースに recordAudit と api_token.create が含まれる", async () => {
    const content = await readSrc("application/usecases/createApiToken.ts");
    expect(content).toContain("recordAudit");
    expect(content).toContain("api_token.create");
  });

  it("createApiToken のソースに db.transaction が含まれる", async () => {
    const content = await readSrc("application/usecases/createApiToken.ts");
    expect(content).toContain("db.transaction");
  });

  it('createApiToken のソースに "cfp_" prefix と randomBytes が含まれる', async () => {
    const content = await readSrc("application/usecases/createApiToken.ts");
    expect(content).toContain("cfp_");
    expect(content).toContain("randomBytes");
  });

  it("createApiToken のソースに createHash と sha256 が含まれる", async () => {
    const content = await readSrc("application/usecases/createApiToken.ts");
    expect(content).toContain("createHash");
    expect(content).toContain("sha256");
  });
});

describe("revokeApiToken — 静的構造検証", () => {
  it("revokeApiToken のソースに recordAudit と api_token.revoke が含まれる", async () => {
    const content = await readSrc("application/usecases/revokeApiToken.ts");
    expect(content).toContain("recordAudit");
    expect(content).toContain("api_token.revoke");
  });

  it("revokeApiToken のソースに db.transaction が含まれる", async () => {
    const content = await readSrc("application/usecases/revokeApiToken.ts");
    expect(content).toContain("db.transaction");
  });
});
