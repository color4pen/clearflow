/**
 * account Server Actions — 静的コード解析テスト
 *
 * 以下を検証する:
 * - "use server" ディレクティブがある
 * - canPerform を使用しない（全ロール許可）
 * - userId は session.user.id から取得し、入力から受け取らない
 * - repository を直接インポートしない
 * - updateOwnProfile / changeOwnPassword usecase をインポートしている
 * - zod によるバリデーションがある（name: min(1), newPassword: min(8)）
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("account.ts — 基本構造", () => {
  it('"use server" ディレクティブが含まれる', async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src.trimStart().startsWith('"use server"')).toBe(true);
  });

  it("canPerform を使用しない（全ロール許可）", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).not.toContain("canPerform");
  });

  it("repository を直接インポートしない", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).not.toContain("@/infrastructure/repositories");
  });

  it("updateOwnProfile usecase をインポートしている", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).toContain("updateOwnProfile");
  });

  it("changeOwnPassword usecase をインポートしている", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).toContain("changeOwnPassword");
  });
});

describe("updateOwnProfileAction — セキュリティ", () => {
  it("session.user.id を使用する（入力から userId を受け取らない）", async () => {
    const src = await readSrc("app/actions/account.ts");
    const actionIdx = src.indexOf("updateOwnProfileAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    expect(afterFn).toContain("session.user.id");
    expect(afterFn).not.toContain('formData.get("userId"');
  });

  it("session.user.organizationId を使用する", async () => {
    const src = await readSrc("app/actions/account.ts");
    const actionIdx = src.indexOf("updateOwnProfileAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    expect(afterFn).toContain("session.user.organizationId");
  });

  it("未認証時に「認証が必要です」を返す", async () => {
    const src = await readSrc("app/actions/account.ts");
    const actionIdx = src.indexOf("updateOwnProfileAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    expect(afterFn).toContain("認証が必要です");
  });
});

describe("updateOwnProfileAction — バリデーション", () => {
  it("name を z.string().min(1) で検証する", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).toContain("z.string().min(1");
    expect(src).toContain("名前は必須です");
  });

  it("revalidatePath('/account') を呼び出す", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).toContain('revalidatePath("/account")');
  });
});

describe("changeOwnPasswordAction — セキュリティ", () => {
  it("session.user.id を使用する（入力から userId を受け取らない）", async () => {
    const src = await readSrc("app/actions/account.ts");
    const actionIdx = src.indexOf("changeOwnPasswordAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    expect(afterFn).toContain("session.user.id");
    expect(afterFn).not.toContain('formData.get("userId"');
  });

  it("session.user.organizationId を使用する", async () => {
    const src = await readSrc("app/actions/account.ts");
    const actionIdx = src.indexOf("changeOwnPasswordAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    expect(afterFn).toContain("session.user.organizationId");
  });

  it("未認証時に「認証が必要です」を返す", async () => {
    const src = await readSrc("app/actions/account.ts");
    const actionIdx = src.indexOf("changeOwnPasswordAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(actionIdx);
    expect(afterFn).toContain("認証が必要です");
  });
});

describe("changeOwnPasswordAction — バリデーション", () => {
  it("newPassword を z.string().min(8) で検証する", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).toContain(".min(8");
    expect(src).toContain("新しいパスワードは8文字以上で入力してください");
  });

  it("currentPassword を z.string().min(1) で検証する", async () => {
    const src = await readSrc("app/actions/account.ts");
    expect(src).toContain("現在のパスワードは必須です");
  });
});
