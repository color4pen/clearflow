/**
 * Account settings usecase — 静的コード解析テスト
 *
 * 以下を検証する:
 * - updateOwnProfile usecase が userRepository.updateProfile を呼び出す
 * - updateOwnProfile usecase が recordAudit を呼び出さない
 * - changeOwnPassword usecase が bcrypt.compare でパスワード照合する
 * - changeOwnPassword usecase が bcrypt.hash でハッシュする（salt round 12）
 * - changeOwnPassword usecase が db.transaction 内で updatePassword + recordAudit を実行する
 * - changeOwnPassword usecase の recordAudit action が "user.updatePassword" である
 * - changeOwnPassword usecase の actorId と targetId が共に userId である
 * - usecase index.ts に updateOwnProfile / changeOwnPassword が export されている
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// updateOwnProfile usecase
// ---------------------------------------------------------------------------

describe("updateOwnProfile usecase", () => {
  it("updateOwnProfile.ts が存在する", async () => {
    const src = await readSrc("application/usecases/updateOwnProfile.ts");
    expect(src).toContain("updateOwnProfile");
  });

  it("userRepository.updateProfile を呼び出す", async () => {
    const src = await readSrc("application/usecases/updateOwnProfile.ts");
    expect(src).toContain("userRepository.updateProfile");
  });

  it("recordAudit を呼び出さない（表示名変更は監査対象外）", async () => {
    const src = await readSrc("application/usecases/updateOwnProfile.ts");
    expect(src).not.toContain("recordAudit");
  });

  it("ユーザーが見つからない場合 ok: false を返す", async () => {
    const src = await readSrc("application/usecases/updateOwnProfile.ts");
    expect(src).toContain("ユーザーが見つかりません");
  });

  it("userId / organizationId / name を入力として受け取る", async () => {
    const src = await readSrc("application/usecases/updateOwnProfile.ts");
    expect(src).toContain("userId");
    expect(src).toContain("organizationId");
    expect(src).toContain("name");
  });
});

// ---------------------------------------------------------------------------
// changeOwnPassword usecase
// ---------------------------------------------------------------------------

describe("changeOwnPassword usecase", () => {
  it("changeOwnPassword.ts が存在する", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain("changeOwnPassword");
  });

  it("bcrypt.compare でパスワード照合する", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain("bcrypt.compare");
  });

  it("bcrypt.hash でハッシュする（salt round 12）", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain("bcrypt.hash");
    expect(src).toContain("12");
  });

  it("db.transaction 内で updatePassword と recordAudit を実行する", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain("db.transaction");
    const txIdx = src.indexOf("db.transaction");
    const updatePasswordIdx = src.indexOf("userRepository.updatePassword", txIdx);
    const recordAuditIdx = src.indexOf("recordAudit", txIdx);
    expect(updatePasswordIdx).toBeGreaterThan(txIdx);
    expect(recordAuditIdx).toBeGreaterThan(txIdx);
  });

  it("recordAudit の action が 'user.updatePassword' である", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain('"user.updatePassword"');
  });

  it("actorId と targetId が共に userId である", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    // actorId: data.userId と targetId: data.userId の両方が存在する
    expect(src).toContain("actorId");
    expect(src).toContain("targetId");
    // actorId と targetId に userId が使われている
    const actorIdx = src.indexOf("actorId");
    const targetIdx = src.indexOf("targetId");
    const actorSection = src.slice(actorIdx, actorIdx + 50);
    const targetSection = src.slice(targetIdx, targetIdx + 50);
    expect(actorSection).toContain("userId");
    expect(targetSection).toContain("userId");
  });

  it("findByIdForAuth でユーザーを取得する", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain("findByIdForAuth");
  });

  it("現在パスワード不一致時に ok: false を返す", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain("現在のパスワードが正しくありません");
  });

  it("ユーザーが見つからない場合 ok: false を返す", async () => {
    const src = await readSrc("application/usecases/changeOwnPassword.ts");
    expect(src).toContain("ユーザーが見つかりません");
  });
});

// ---------------------------------------------------------------------------
// usecase index.ts エクスポート
// ---------------------------------------------------------------------------

describe("usecases/index.ts エクスポート", () => {
  it("updateOwnProfile が export されている", async () => {
    const src = await readSrc("application/usecases/index.ts");
    expect(src).toContain("updateOwnProfile");
  });

  it("changeOwnPassword が export されている", async () => {
    const src = await readSrc("application/usecases/index.ts");
    expect(src).toContain("changeOwnPassword");
  });
});
