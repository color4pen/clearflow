/**
 * User management usecase tests
 *
 * Verifies that updateUserRole usecase enforces:
 * - self-modification guard
 * - audit log recording within transaction
 * - metadata contains oldRole and newRole
 * - admin-only guard in Server Actions
 *
 * All tests are static code analysis (no live DB required).
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// updateUserRole usecase
// ---------------------------------------------------------------------------

describe("updateUserRole usecase", () => {
  it("has self-modification guard (actorId === targetUserId)", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    // Guard uses data.actorId === data.targetUserId pattern
    expect(src).toMatch(/actorId.*===.*targetUserId|targetUserId.*===.*actorId/);
    expect(src).toContain("自分自身のロールは変更できません");
  });

  it("calls db.transaction for role update + audit log", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain("db.transaction");
  });

  it("calls recordAudit inside the transaction", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain("recordAudit");
    // audit log call must appear after db.transaction
    const txIdx = src.indexOf("db.transaction");
    const auditIdx = src.indexOf("await recordAudit(");
    expect(txIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(-1);
    expect(txIdx).toBeLessThan(auditIdx);
  });

  it("includes oldRole and newRole in audit log metadata", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain("oldRole");
    expect(src).toContain("newRole");
    // Both must appear in the metadata section
    const metadataIdx = src.indexOf("metadata:");
    expect(metadataIdx).toBeGreaterThan(-1);
    const metadataSection = src.slice(metadataIdx, metadataIdx + 200);
    expect(metadataSection).toContain("oldRole");
    expect(metadataSection).toContain("newRole");
  });

  it("uses action 'user.updateRole'", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain('"user.updateRole"');
  });

  it("returns ok: false when user not found", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain("ユーザーが見つかりません");
  });
});

// ---------------------------------------------------------------------------
// Last admin guard
// ---------------------------------------------------------------------------

describe("updateUserRole 最後の admin ガード", () => {
  it("findByOrganization を使ってガードを実装している", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain("findByOrganization");
  });

  it('"組織に最低1人の管理者が必要です" エラーメッセージが含まれる', async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain("組織に最低1人の管理者が必要です");
  });

  it("最後の admin ガードが currentUser.role === \"admin\" 条件でのみ実行される", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toMatch(/currentUser\.role\s*===\s*["']admin["']/);
  });

  it("自己降格ガード \"自分自身のロールは変更できません\" が引き続き存在する", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    expect(src).toContain("自分自身のロールは変更できません");
  });

  it("自己降格ガードが最後の admin ガードより先に評価される", async () => {
    const src = await readSrc("application/usecases/updateUserRole.ts");
    const selfGuardIdx = src.indexOf("自分自身のロールは変更できません");
    const lastAdminIdx = src.indexOf("組織に最低1人の管理者が必要です");
    expect(selfGuardIdx).toBeGreaterThan(-1);
    expect(lastAdminIdx).toBeGreaterThan(-1);
    expect(selfGuardIdx).toBeLessThan(lastAdminIdx);
  });
});

// ---------------------------------------------------------------------------
// createUser usecase
// ---------------------------------------------------------------------------

describe("createUser usecase", () => {
  it("createUser usecase ファイルが存在する", async () => {
    const src = await readSrc("application/usecases/createUser.ts");
    expect(src).toContain("createUser");
  });

  it("findByEmailForAuth による email 重複チェックがある", async () => {
    const src = await readSrc("application/usecases/createUser.ts");
    expect(src).toContain("findByEmailForAuth");
  });

  it("email 重複時のエラーメッセージが含まれる", async () => {
    const src = await readSrc("application/usecases/createUser.ts");
    expect(src).toContain("このメールアドレスは既に使用されています");
  });

  it("bcrypt.hash によるパスワードハッシュがある（salt round 12）", async () => {
    const src = await readSrc("application/usecases/createUser.ts");
    expect(src).toContain("bcrypt.hash");
    expect(src).toContain("12");
  });

  it("db.transaction でトランザクションが使われている", async () => {
    const src = await readSrc("application/usecases/createUser.ts");
    expect(src).toContain("db.transaction");
  });

  it("recordAudit がトランザクション内で呼び出される", async () => {
    const src = await readSrc("application/usecases/createUser.ts");
    expect(src).toContain("recordAudit");
    const txIdx = src.indexOf("db.transaction");
    const auditIdx = src.indexOf("await recordAudit(");
    expect(txIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(-1);
    expect(txIdx).toBeLessThan(auditIdx);
  });

  it('action が "user.create" である', async () => {
    const src = await readSrc("application/usecases/createUser.ts");
    expect(src).toContain('"user.create"');
  });

  it("index.ts に createUser が export されている", async () => {
    const src = await readSrc("application/usecases/index.ts");
    expect(src).toContain('createUser');
  });
});

// ---------------------------------------------------------------------------
// Server Actions admin guard
// ---------------------------------------------------------------------------

describe("users Server Actions admin guard", () => {
  it("listUsersAction has canPerform guard", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src).toContain('canPerform');
    const listIdx = src.indexOf("listUsersAction");
    expect(listIdx).toBeGreaterThan(-1);
    const guardIdx = src.indexOf('canPerform', listIdx);
    expect(guardIdx).toBeGreaterThan(-1);
  });

  it("updateUserRoleAction has canPerform guard", async () => {
    const src = await readSrc("app/actions/users.ts");
    const actionIdx = src.indexOf("updateUserRoleAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const guardIdx = src.indexOf('canPerform', actionIdx);
    expect(guardIdx).toBeGreaterThan(-1);
  });

  it("users.ts has 'use server' directive", async () => {
    const src = await readSrc("app/actions/users.ts");
    expect(src.trimStart().startsWith('"use server"')).toBe(true);
  });
});
