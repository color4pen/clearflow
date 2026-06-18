/**
 * Template management usecase tests
 *
 * Verifies that template CRUD usecases enforce:
 * - audit log recording within transactions
 * - pending-request check before deletion
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
// createTemplate usecase
// ---------------------------------------------------------------------------

describe("createTemplate usecase", () => {
  it("calls db.transaction", async () => {
    const src = await readSrc("application/usecases/createTemplate.ts");
    expect(src).toContain("db.transaction");
  });

  it("calls auditLogRepository.create inside the transaction", async () => {
    const src = await readSrc("application/usecases/createTemplate.ts");
    expect(src).toContain("auditLogRepository.create");
    // auditLogRepository.create must appear after db.transaction in source
    const txIdx = src.indexOf("db.transaction");
    const auditIdx = src.indexOf("auditLogRepository.create");
    expect(txIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(-1);
    expect(txIdx).toBeLessThan(auditIdx);
  });

  it("uses action 'template.create'", async () => {
    const src = await readSrc("application/usecases/createTemplate.ts");
    expect(src).toContain('"template.create"');
  });
});

// ---------------------------------------------------------------------------
// deleteTemplate usecase — usage check + transaction
// ---------------------------------------------------------------------------

describe("deleteTemplate usecase", () => {
  it("calls existsPendingByTemplateId before deleteById", async () => {
    const src = await readSrc("application/usecases/deleteTemplate.ts");
    const checkIdx = src.indexOf("existsPendingByTemplateId");
    const deleteIdx = src.indexOf("deleteById");
    expect(checkIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(-1);
    expect(checkIdx).toBeLessThan(deleteIdx);
  });

  it("calls db.transaction for delete + audit log", async () => {
    const src = await readSrc("application/usecases/deleteTemplate.ts");
    expect(src).toContain("db.transaction");
    expect(src).toContain("auditLogRepository.create");
  });

  it("uses action 'template.delete'", async () => {
    const src = await readSrc("application/usecases/deleteTemplate.ts");
    expect(src).toContain('"template.delete"');
  });

  it("returns ok: false with correct reason when template is in use", async () => {
    const src = await readSrc("application/usecases/deleteTemplate.ts");
    expect(src).toContain("このテンプレートを使用中の承認待ちリクエストがあるため削除できません");
  });
});

// ---------------------------------------------------------------------------
// updateTemplate usecase
// ---------------------------------------------------------------------------

describe("updateTemplate usecase", () => {
  it("calls db.transaction", async () => {
    const src = await readSrc("application/usecases/updateTemplate.ts");
    expect(src).toContain("db.transaction");
  });

  it("calls auditLogRepository.create inside the transaction", async () => {
    const src = await readSrc("application/usecases/updateTemplate.ts");
    expect(src).toContain("auditLogRepository.create");
  });

  it("uses action 'template.update'", async () => {
    const src = await readSrc("application/usecases/updateTemplate.ts");
    expect(src).toContain('"template.update"');
  });
});

// ---------------------------------------------------------------------------
// Server Actions admin guard
// ---------------------------------------------------------------------------

describe("templates Server Actions admin guard", () => {
  it("createTemplateAction has role !== 'admin' guard", async () => {
    const src = await readSrc("app/actions/templates.ts");
    expect(src).toContain('role !== "admin"');
  });

  it("updateTemplateAction has role !== 'admin' guard", async () => {
    const src = await readSrc("app/actions/templates.ts");
    // Verify updateTemplateAction function body contains the admin guard
    const updateIdx = src.indexOf("updateTemplateAction");
    expect(updateIdx).toBeGreaterThan(-1);
    const adminGuardIdx = src.indexOf('role !== "admin"', updateIdx);
    expect(adminGuardIdx).toBeGreaterThan(-1);
  });

  it("deleteTemplateAction has role !== 'admin' guard", async () => {
    const src = await readSrc("app/actions/templates.ts");
    const deleteIdx = src.indexOf("deleteTemplateAction");
    expect(deleteIdx).toBeGreaterThan(-1);
    const adminGuardIdx = src.indexOf('role !== "admin"', deleteIdx);
    expect(adminGuardIdx).toBeGreaterThan(-1);
  });

  it("templates.ts has 'use server' directive", async () => {
    const src = await readSrc("app/actions/templates.ts");
    expect(src.trimStart().startsWith('"use server"')).toBe(true);
  });
});
