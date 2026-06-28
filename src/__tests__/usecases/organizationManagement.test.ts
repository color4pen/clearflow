/**
 * 組織管理 usecase — 静的コード解析テスト
 *
 * ライブ DB / 認証を使わず、ソースファイルを静的解析して実装パターンを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// updateOrganization usecase
// ---------------------------------------------------------------------------

describe("updateOrganization usecase", () => {
  it("usecase ファイルが存在し、updateOrganization 関数が export されている", async () => {
    const src = await readSrc("application/usecases/updateOrganization.ts");
    expect(src).toContain("updateOrganization");
    expect(src).toContain("export async function updateOrganization");
  });

  it("db.transaction 内で organizationRepository.update と recordAudit が呼ばれる", async () => {
    const src = await readSrc("application/usecases/updateOrganization.ts");
    expect(src).toContain("db.transaction");
    expect(src).toContain("organizationRepository.update");
    expect(src).toContain("recordAudit");
  });

  it("recordAudit が db.transaction の後に出現する（トランザクション内）", async () => {
    const src = await readSrc("application/usecases/updateOrganization.ts");
    const txIdx = src.indexOf("db.transaction");
    const auditIdx = src.indexOf("await recordAudit(");
    expect(txIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(-1);
    expect(txIdx).toBeLessThan(auditIdx);
  });

  it('action が "organization.update" である', async () => {
    const src = await readSrc("application/usecases/updateOrganization.ts");
    expect(src).toContain('"organization.update"');
  });

  it('targetType が "organization" である', async () => {
    const src = await readSrc("application/usecases/updateOrganization.ts");
    expect(src).toContain('"organization"');
    const metadataIdx = src.indexOf("targetType:");
    expect(metadataIdx).toBeGreaterThan(-1);
    const section = src.slice(metadataIdx, metadataIdx + 100);
    expect(section).toContain('"organization"');
  });

  it("metadata に name が含まれる", async () => {
    const src = await readSrc("application/usecases/updateOrganization.ts");
    const metadataIdx = src.indexOf("metadata:");
    expect(metadataIdx).toBeGreaterThan(-1);
    const metadataSection = src.slice(metadataIdx, metadataIdx + 100);
    expect(metadataSection).toContain("name");
  });

  it('組織が見つからない場合のエラーメッセージ "組織が見つかりません" が含まれる', async () => {
    const src = await readSrc("application/usecases/updateOrganization.ts");
    expect(src).toContain("組織が見つかりません");
  });

  it("index.ts に updateOrganization が re-export されている", async () => {
    const src = await readSrc("application/usecases/index.ts");
    expect(src).toContain("updateOrganization");
  });
});
