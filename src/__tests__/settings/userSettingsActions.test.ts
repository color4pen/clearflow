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

// ---------------------------------------------------------------------------
// createUserAction
// ---------------------------------------------------------------------------

describe("createUserAction — 静的コード解析", () => {
  it("createUserAction が存在する", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("createUserAction");
  });

  // TC-010: 認証されていないユーザーからの呼び出し
  it("TC-010: 未認証時に「認証が必要です」を返す分岐が存在する", async () => {
    const src = await readSrc("app/actions/users.ts");
    const actionIdx = src.indexOf("createUserAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    // session が無い場合の認証チェック
    expect(afterFn).toContain("session?.user?.id");
    expect(afterFn).toContain("認証が必要です");
  });

  // TC-018: organizationId と actorId をセッションから取得する
  it("TC-018: organizationId と actorId が formData からではなくセッションから参照される", async () => {
    const src = await readSrc("app/actions/users.ts");
    const actionIdx = src.indexOf("createUserAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    // セッション由来であることを確認
    expect(afterFn).toContain("session.user.organizationId");
    expect(afterFn).toContain("session.user.id");
    // formData から organizationId や actorId を取得していないことを確認
    expect(afterFn).not.toContain('formData.get("organizationId"');
    expect(afterFn).not.toContain('formData.get("actorId"');
  });

  it("canPerform で createUser 権限チェックを行う", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain('"createUser"');
    const actionIdx = src.indexOf("createUserAction");
    const guardIdx = src.indexOf('"createUser"', actionIdx);
    expect(guardIdx).toBeGreaterThan(-1);
  });

  it("zod で email を email 形式で検証する", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("z.string().email");
  });

  it("zod で name を必須で検証する（min(1)）", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain('z.string().min(1');
  });

  it("zod で role を enum で検証する", async () => {
    const src = await readSrc("app/actions/users.ts");
    // createUserSchema に z.enum が含まれる
    const schemaIdx = src.indexOf("createUserSchema");
    const enumIdx = src.indexOf("z.enum", schemaIdx);
    expect(enumIdx).toBeGreaterThan(-1);
  });

  it("zod で password を最小8文字で検証する", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("パスワードは8文字以上で入力してください");
    expect(src).toContain(".min(8");
  });

  it("成功後に /settings/users を revalidatePath する", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("revalidatePath");
    expect(src).toContain('"/settings/users"');
  });

  it("CreateUserState 型が export されている", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain("export type CreateUserState");
  });

  it("settings/users ページが CreateUserForm を利用する", async () => {
    const src = await readSrc("app/(dashboard)/settings/users/page.tsx");
    expect(src).toContain("CreateUserForm");
  });
});
