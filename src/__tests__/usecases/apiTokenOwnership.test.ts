/**
 * API トークン所有権制約とテナント分離の静的解析テスト
 *
 * repository / Server Action のソースに本人+テナント制約が含まれていることを確認する。
 */

import { describe, it, expect } from "bun:test";
import { readFile } from "fs/promises";
import path from "path";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("apiTokenRepository — 本人+テナント制約の静的検証", () => {
  it("revokeById のソースに userId と organizationId の WHERE 条件が含まれる", async () => {
    const content = await readSrc(
      "infrastructure/repositories/apiTokenRepository.ts"
    );
    const revokeIdx = content.indexOf("export async function revokeById(");
    expect(revokeIdx).toBeGreaterThan(-1);
    const body = content.slice(revokeIdx);
    expect(body).toContain("userId");
    expect(body).toContain("organizationId");
  });

  it("findByUserAndOrganization のソースに userId と organizationId の WHERE 条件が含まれる", async () => {
    const content = await readSrc(
      "infrastructure/repositories/apiTokenRepository.ts"
    );
    const findIdx = content.indexOf(
      "export async function findByUserAndOrganization("
    );
    expect(findIdx).toBeGreaterThan(-1);
    const body = content.slice(findIdx);
    expect(body).toContain("userId");
    expect(body).toContain("organizationId");
  });
});

describe("apiTokens Server Actions — セッションからの userId / organizationId 取得", () => {
  it("app/actions/apiTokens.ts のソースが session.user.id と session.user.organizationId を使用している", async () => {
    const content = await readSrc("app/actions/apiTokens.ts");
    expect(content).toContain("session.user.id");
    expect(content).toContain("session.user.organizationId");
  });

  it("app/actions/apiTokens.ts のソースが formData から userId / organizationId を取得していない", async () => {
    const content = await readSrc("app/actions/apiTokens.ts");
    // formData.get("userId") や formData.get("organizationId") が存在しないことを確認
    expect(content).not.toContain('formData.get("userId")');
    expect(content).not.toContain('formData.get("organizationId")');
    expect(content).not.toContain("formData.get('userId')");
    expect(content).not.toContain("formData.get('organizationId')");
  });
});
