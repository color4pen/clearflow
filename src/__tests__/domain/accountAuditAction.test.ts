/**
 * AuditAction — アカウント設定関連の監査ログアクション 静的コード解析テスト
 *
 * 以下を検証する:
 * - AuditAction 型に "user.updatePassword" が含まれる
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("AuditAction — user.updatePassword", () => {
  it('AuditAction 型に "user.updatePassword" が含まれる', async () => {
    const src = await readSrc("domain/models/auditLog.ts");
    expect(src).toContain('"user.updatePassword"');
  });

  it("既存の user.create が維持されている", async () => {
    const src = await readSrc("domain/models/auditLog.ts");
    expect(src).toContain('"user.create"');
  });

  it("既存の user.updateRole が維持されている", async () => {
    const src = await readSrc("domain/models/auditLog.ts");
    expect(src).toContain('"user.updateRole"');
  });
});

describe("/account ページ — 全ロールアクセス", () => {
  it("/account ページに role !== 'admin' リダイレクトが無い", async () => {
    const src = await readSrc("app/(dashboard)/account/page.tsx");
    expect(src).not.toContain('role !== "admin"');
    expect(src).not.toContain("role !== 'admin'");
    expect(src).not.toContain("canPerform");
  });

  it("/account ページにロールチェックが無い", async () => {
    const src = await readSrc("app/(dashboard)/account/page.tsx");
    // admin/manager のロールに限定するガードが無いことを確認
    expect(src).not.toContain("user.role");
  });
});

describe("SidebarNav — /account リンク", () => {
  it("SidebarNav に /account が含まれる", async () => {
    const src = await readSrc("app/(dashboard)/SidebarNav.tsx");
    expect(src).toContain('"/account"');
  });

  it("/account エントリに adminOnly が設定されていない", async () => {
    const src = await readSrc("app/(dashboard)/SidebarNav.tsx");
    const accountIdx = src.indexOf('"/account"');
    expect(accountIdx).toBeGreaterThan(-1);
    // /account エントリの行（改行まで）に adminOnly が無いことを確認
    const lineEnd = src.indexOf("\n", accountIdx);
    const accountLine = src.slice(accountIdx, lineEnd > -1 ? lineEnd : accountIdx + 80);
    expect(accountLine).not.toContain("adminOnly");
  });
});
