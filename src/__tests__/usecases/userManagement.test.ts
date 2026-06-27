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
