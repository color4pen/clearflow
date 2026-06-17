/**
 * Optimistic lock tests — static code analysis
 *
 * These tests verify that optimistic locking is correctly implemented
 * by analyzing the source code of repository and usecase files.
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// Repository: version column in WHERE clause
// ---------------------------------------------------------------------------

describe("Repository: optimistic lock WHERE clause", () => {
  it("requestRepository.updateStatus includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // Should have eq(requests.version, expectedVersion) in the where clause
    expect(src).toContain("eq(requests.version, expectedVersion)");
  });

  it("approvalStepRepository.updateStatus includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/approvalStepRepository.ts");
    expect(src).toContain("eq(approvalSteps.version, expectedVersion)");
  });

  it("requestRepository.updateStatus increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    expect(src).toContain("version: sql`version + 1`");
  });

  it("approvalStepRepository.updateStatus increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/approvalStepRepository.ts");
    expect(src).toContain("version: sql`version + 1`");
  });

  it("approvalStepRepository.resetSteps increments version", async () => {
    const src = await readSrc("infrastructure/repositories/approvalStepRepository.ts");
    // The resetSteps function should also increment version
    const resetStepsIdx = src.indexOf("export async function resetSteps");
    const versionIncrementIdx = src.indexOf("version: sql`version + 1`", resetStepsIdx);
    expect(resetStepsIdx).toBeGreaterThan(-1);
    expect(versionIncrementIdx).toBeGreaterThan(resetStepsIdx);
  });

  it("requestRepository.mapRow includes version field", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    expect(src).toContain("version: row.version");
  });

  it("approvalStepRepository.mapRow includes version field", async () => {
    const src = await readSrc("infrastructure/repositories/approvalStepRepository.ts");
    expect(src).toContain("version: row.version");
  });
});

// ---------------------------------------------------------------------------
// Usecase: version passed to updateStatus
// ---------------------------------------------------------------------------

describe("Usecase: version passed to updateStatus", () => {
  it("approveRequest passes version to requestRepository.updateStatus (no-steps path)", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    // Should pass existing.version to updateStatus
    expect(src).toContain("existing.version");
    expect(src).toContain("updateStatus");
  });

  it("approveRequest passes freshCurrentStep.version to approvalStepRepository.updateStatus", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("freshCurrentStep.version");
  });

  it("rejectRequest passes existing.version to requestRepository.updateStatus", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain("existing.version");
    expect(src).toContain("updateStatus");
  });

  it("rejectRequest passes currentStep.version to approvalStepRepository.updateStatus", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain("currentStep.version");
  });

  it("submitRequest passes existing.version to requestRepository.updateStatus", async () => {
    const src = await readSrc("application/usecases/submitRequest.ts");
    expect(src).toContain("existing.version");
    expect(src).toContain("updateStatus");
  });

  it("resubmitRequest passes existing.version to requestRepository.updateStatus", async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    expect(src).toContain("existing.version");
    expect(src).toContain("updateStatus");
  });
});

// ---------------------------------------------------------------------------
// Usecase: optimistic lock failure message
// ---------------------------------------------------------------------------

describe("Usecase: optimistic lock failure message", () => {
  const EXPECTED_MESSAGE = "この申請は他のユーザーによって更新されました";

  it("approveRequest contains optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain(EXPECTED_MESSAGE);
  });

  it("rejectRequest contains optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain(EXPECTED_MESSAGE);
  });

  it("submitRequest contains optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/submitRequest.ts");
    expect(src).toContain(EXPECTED_MESSAGE);
  });

  it("resubmitRequest contains optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    expect(src).toContain(EXPECTED_MESSAGE);
  });
});

// ---------------------------------------------------------------------------
// Domain model: version field
// ---------------------------------------------------------------------------

describe("Domain model: version field", () => {
  it("Request type has version: number field", async () => {
    const src = await readSrc("domain/models/request.ts");
    expect(src).toContain("version: number");
  });

  it("ApprovalStep type has version: number field", async () => {
    const src = await readSrc("domain/models/approvalStep.ts");
    expect(src).toContain("version: number");
  });
});

// ---------------------------------------------------------------------------
// Schema: version columns
// ---------------------------------------------------------------------------

describe("Schema: version columns", () => {
  it("requests table has version column in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    // Find requests table and check for version column
    const requestsTableStart = src.indexOf('pgTable("requests"');
    const requestsTableEnd = src.indexOf("});", requestsTableStart);
    const requestsTable = src.substring(requestsTableStart, requestsTableEnd);
    expect(requestsTable).toContain('integer("version")');
    expect(requestsTable).toContain(".notNull()");
    expect(requestsTable).toContain(".default(1)");
  });

  it("approval_steps table has version column in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const approvalStepsTableStart = src.indexOf('pgTable("approval_steps"');
    const approvalStepsTableEnd = src.indexOf("});", approvalStepsTableStart);
    const approvalStepsTable = src.substring(approvalStepsTableStart, approvalStepsTableEnd);
    expect(approvalStepsTable).toContain('integer("version")');
    expect(approvalStepsTable).toContain(".notNull()");
    expect(approvalStepsTable).toContain(".default(1)");
  });
});

// ---------------------------------------------------------------------------
// requestRepository.findById supports Transaction parameter (T-11)
// ---------------------------------------------------------------------------

describe("requestRepository.findById supports Transaction parameter", () => {
  it("findById accepts optional tx parameter", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // The findById function should have tx?: Transaction parameter
    expect(src).toContain("tx?: Transaction");
    // Should use queryRunner pattern
    expect(src).toContain("const queryRunner = tx ?? db");
    // findById should appear before updateStatus to verify it uses the queryRunner
    const findByIdIdx = src.indexOf("export async function findById");
    const queryRunnerIdx = src.indexOf("const queryRunner = tx ?? db", findByIdIdx);
    expect(findByIdIdx).toBeGreaterThan(-1);
    expect(queryRunnerIdx).toBeGreaterThan(findByIdIdx);
  });
});
