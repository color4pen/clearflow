/**
 * ユーザー設定アクション — 静的コード解析テスト
 *
 * TC-010: ロール select の動作が維持される
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
// TC-010: ロール select の動作が維持される
// ---------------------------------------------------------------------------

describe("TC-010: updateUserRoleAction — ロール変更がサーバーに送信される", () => {
  it("updateUserRoleAction が存在する", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("updateUserRoleAction");
  });

  it('"use server" ディレクティブが含まれる', async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain('"use server"');
  });

  it("canPerform で changeRole 権限チェックを行う", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("canPerform");
    expect(src).toContain('"changeRole"');
  });

  it("userId と role を FormData から取得する", async () => {
    const src = await readSrc("app/actions/users.ts");
    const fnIdx = src.indexOf("updateUserRoleAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("userId");
    expect(afterFn).toContain("role");
    expect(afterFn).toContain("formData.get");
  });

  it("zod スキーマで role enum を検証する（admin/member/manager/finance）", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("z.enum");
    expect(src).toContain('"admin"');
    expect(src).toContain('"member"');
    expect(src).toContain('"manager"');
    expect(src).toContain('"finance"');
  });

  it("updateUserRole ユースケースを呼び出す", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("updateUserRole");
    expect(src).toContain("updateUserRole({");
  });

  it("成功後に /settings/users パスを revalidatePath する", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("revalidatePath");
    expect(src).toContain('"/settings/users"');
  });

  it("UserRoleSelect コンポーネントが updateUserRoleAction を呼び出す", async () => {
    const src = await readSrc("app/(dashboard)/settings/users/UserRoleSelect.tsx");
    expect(src).toContain("updateUserRoleAction");
    // FormData に userId と role をセットしてアクションを呼び出す
    expect(src).toContain('formData.set("userId"');
    expect(src).toContain('formData.set("role"');
  });

  it("ユーザー一覧ページが UserRoleSelect を利用する", async () => {
    const src = await readSrc("app/(dashboard)/settings/users/page.tsx");
    expect(src).toContain("UserRoleSelect");
    // ロールカラムが存在する
    expect(src).toContain('"ロール"');
  });
});
