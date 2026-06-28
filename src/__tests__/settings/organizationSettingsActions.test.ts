/**
 * 組織設定アクション — 静的コード解析テスト
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
// updateOrganizationAction
// ---------------------------------------------------------------------------

describe("updateOrganizationAction — 静的コード解析", () => {
  it("updateOrganizationAction が存在する", async () => {
    const src = await readSrc("app/actions/organization.ts");
    expect(src).toContain("updateOrganizationAction");
  });

  it('"use server" ディレクティブが含まれる', async () => {
    const src = await readSrc("app/actions/organization.ts");
    expect(src.trimStart().startsWith('"use server"')).toBe(true);
  });

  it('canPerform で "updateOrganization" 権限チェックを行う', async () => {
    const src = await readSrc("app/actions/organization.ts");
    expect(src).toContain("canPerform");
    expect(src).toContain('"updateOrganization"');
  });

  it("organizationId が session 由来で formData から取得しない", async () => {
    const src = await readSrc("app/actions/organization.ts");
    const fnIdx = src.indexOf("updateOrganizationAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("session.user.organizationId");
    expect(afterFn).not.toContain('formData.get("organizationId"');
  });

  it("actorId が session 由来で formData から取得しない", async () => {
    const src = await readSrc("app/actions/organization.ts");
    const fnIdx = src.indexOf("updateOrganizationAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("session.user.id");
    expect(afterFn).not.toContain('formData.get("actorId"');
  });

  it("zod で name を検証する（.string(), .min(1), .max(100)）", async () => {
    const src = await readSrc("app/actions/organization.ts");
    expect(src).toContain(".string()");
    expect(src).toContain(".min(1");
    expect(src).toContain(".max(100");
  });

  it('成功後に "/settings/organization" を revalidatePath する', async () => {
    const src = await readSrc("app/actions/organization.ts");
    expect(src).toContain("revalidatePath");
    expect(src).toContain('"/settings/organization"');
  });

  it("UpdateOrganizationState 型が export されている", async () => {
    const src = await readSrc("app/actions/organization.ts");
    expect(src).toContain("export type UpdateOrganizationState");
  });
});
