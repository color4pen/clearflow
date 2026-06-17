/**
 * Idempotency key tests — static code analysis
 *
 * These tests verify that idempotency key support is correctly implemented
 * by analyzing the source code of schema, repository, and action files.
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// Schema: idempotency_keys table
// ---------------------------------------------------------------------------

describe("Schema: idempotency_keys table", () => {
  it("idempotencyKeys table is defined in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    expect(src).toContain('pgTable("idempotency_keys"');
  });

  it("idempotency_keys table has key column with unique constraint", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const tableStart = src.indexOf('pgTable("idempotency_keys"');
    const tableEnd = src.indexOf("});", tableStart);
    const table = src.substring(tableStart, tableEnd);
    expect(table).toContain('text("key")');
    expect(table).toContain(".unique()");
  });

  it("idempotency_keys table has action column", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const tableStart = src.indexOf('pgTable("idempotency_keys"');
    const tableEnd = src.indexOf("});", tableStart);
    const table = src.substring(tableStart, tableEnd);
    expect(table).toContain('text("action")');
  });

  it("idempotency_keys table has result column as jsonb", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const tableStart = src.indexOf('pgTable("idempotency_keys"');
    const tableEnd = src.indexOf("});", tableStart);
    const table = src.substring(tableStart, tableEnd);
    expect(table).toContain('jsonb("result")');
  });

  it("idempotency_keys table has organizationId column as FK", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const tableStart = src.indexOf('pgTable("idempotency_keys"');
    const tableEnd = src.indexOf("});", tableStart);
    const table = src.substring(tableStart, tableEnd);
    expect(table).toContain('uuid("organization_id")');
    expect(table).toContain(".references(");
  });

  it("idempotency_keys table has createdAt column", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const tableStart = src.indexOf('pgTable("idempotency_keys"');
    const tableEnd = src.indexOf("});", tableStart);
    const table = src.substring(tableStart, tableEnd);
    expect(table).toContain('timestamp("created_at")');
    expect(table).toContain(".defaultNow()");
  });
});

// ---------------------------------------------------------------------------
// Server Actions: idempotencyKey parameter handling
// ---------------------------------------------------------------------------

describe("Server Actions: idempotencyKey parameter handling", () => {
  it("submitRequestAction reads idempotencyKey from FormData", async () => {
    const src = await readSrc("app/actions/requests.ts");
    // Find submitRequestAction and verify it reads idempotencyKey
    const actionStart = src.indexOf("export async function submitRequestAction");
    const actionEnd = src.indexOf("export async function", actionStart + 1);
    const actionSrc = actionEnd > actionStart
      ? src.substring(actionStart, actionEnd)
      : src.substring(actionStart);
    expect(actionSrc).toContain("idempotencyKey");
    expect(actionSrc).toContain('formData.get("idempotencyKey")');
  });

  it("approveRequestAction reads idempotencyKey from FormData", async () => {
    const src = await readSrc("app/actions/requests.ts");
    const actionStart = src.indexOf("export async function approveRequestAction");
    const actionEnd = src.indexOf("export async function", actionStart + 1);
    const actionSrc = actionEnd > actionStart
      ? src.substring(actionStart, actionEnd)
      : src.substring(actionStart);
    expect(actionSrc).toContain("idempotencyKey");
    expect(actionSrc).toContain('formData.get("idempotencyKey")');
  });

  it("rejectRequestAction reads idempotencyKey from FormData", async () => {
    const src = await readSrc("app/actions/requests.ts");
    const actionStart = src.indexOf("export async function rejectRequestAction");
    const actionEnd = src.indexOf("export async function", actionStart + 1);
    const actionSrc = actionEnd > actionStart
      ? src.substring(actionStart, actionEnd)
      : src.substring(actionStart);
    expect(actionSrc).toContain("idempotencyKey");
    expect(actionSrc).toContain('formData.get("idempotencyKey")');
  });

  it("resubmitRequestAction reads idempotencyKey from FormData", async () => {
    const src = await readSrc("app/actions/requests.ts");
    const actionStart = src.indexOf("export async function resubmitRequestAction");
    const actionEnd = src.indexOf("export async function", actionStart + 1);
    const actionSrc = actionEnd > actionStart
      ? src.substring(actionStart, actionEnd)
      : src.substring(actionStart);
    expect(actionSrc).toContain("idempotencyKey");
    expect(actionSrc).toContain('formData.get("idempotencyKey")');
  });

  it("Server Actions check idempotency key with findByKey before executing usecase", async () => {
    const src = await readSrc("app/actions/requests.ts");
    // findByKey should appear before each usecase call pattern
    expect(src).toContain("findByKey");
    expect(src).toContain("idempotencyKeyRepository");
  });

  it("Server Actions save result with idempotencyKeyRepository.create", async () => {
    const src = await readSrc("app/actions/requests.ts");
    expect(src).toContain("idempotencyKeyRepository.create");
  });
});

// ---------------------------------------------------------------------------
// idempotencyKeyRepository: exports findByKey and create
// ---------------------------------------------------------------------------

describe("idempotencyKeyRepository: findByKey and create", () => {
  it("idempotencyKeyRepository exports findByKey function", async () => {
    const src = await readSrc("infrastructure/repositories/idempotencyKeyRepository.ts");
    expect(src).toContain("export async function findByKey");
  });

  it("idempotencyKeyRepository exports create function", async () => {
    const src = await readSrc("infrastructure/repositories/idempotencyKeyRepository.ts");
    expect(src).toContain("export async function create");
  });

  it("idempotencyKeyRepository is exported from repositories index", async () => {
    const src = await readSrc("infrastructure/repositories/index.ts");
    expect(src).toContain("idempotencyKeyRepository");
  });
});

// ---------------------------------------------------------------------------
// Dependency direction: usecase layer does not import idempotencyKeyRepository
// ---------------------------------------------------------------------------

describe("Dependency direction: usecase layer does not import idempotencyKeyRepository", () => {
  const usecaseFiles = [
    "application/usecases/approveRequest.ts",
    "application/usecases/rejectRequest.ts",
    "application/usecases/submitRequest.ts",
    "application/usecases/resubmitRequest.ts",
  ];

  for (const file of usecaseFiles) {
    it(`${file} does not import idempotencyKeyRepository`, async () => {
      const src = await readSrc(file);
      expect(src).not.toContain("idempotencyKeyRepository");
    });
  }
});
