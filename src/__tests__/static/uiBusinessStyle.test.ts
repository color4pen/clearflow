/**
 * UI business style — static analysis tests
 *
 * TC-003: styles.ts に BTN_DANGER が定義されている
 * TC-004: styles.ts に BTN_SUBMIT が定義されている
 * TC-021: RequestWithSteps 型に承認ステップ情報（ApprovalStepSummary[]）が含まれる
 * TC-022: findAllWithStepsByOrganization が Map ベースグルーピングで N+1 を回避する
 * TC-032: styles.ts に BTN_PRIMARY_DISABLED が定義されている
 * TC-033: styles.ts に SELECT_BASE が定義されている
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// TC-021: RequestWithSteps 型に承認ステップ情報が含まれる
// ---------------------------------------------------------------------------

describe("RequestWithSteps type — TC-021", () => {
  /**
   * TC-021: request.ts に RequestWithSteps 型が定義されており
   *         ApprovalStepSummary[] の approvalSteps フィールドを持つ
   */
  it("TC-021: domain/models/request.ts exports RequestWithSteps type with approvalSteps", async () => {
    const content = await readSrc("domain/models/request.ts");
    expect(content).toContain("RequestWithSteps");
    expect(content).toContain("approvalSteps");
    expect(content).toContain("ApprovalStepSummary");
  });

  it("TC-021: ApprovalStepSummary contains approverRole: string", async () => {
    const content = await readSrc("domain/models/request.ts");
    expect(content).toContain("ApprovalStepSummary");
    expect(content).toContain("approverRole");
    expect(content).toContain("string");
  });

  it("TC-021: ApprovalStepSummary contains status as pending | approved | rejected", async () => {
    const content = await readSrc("domain/models/request.ts");
    // status field must be a union of the three step statuses
    expect(content).toContain('"pending"');
    expect(content).toContain('"approved"');
    expect(content).toContain('"rejected"');
  });

  it("TC-021: ApprovalStepSummary contains deadline: Date | null", async () => {
    const content = await readSrc("domain/models/request.ts");
    expect(content).toContain("deadline");
    expect(content).toContain("Date | null");
  });

  it("TC-021: RequestWithSteps extends Request with approvalSteps array", async () => {
    const content = await readSrc("domain/models/request.ts");
    // The type should compose Request and add approvalSteps
    const withStepsIdx = content.indexOf("RequestWithSteps");
    expect(withStepsIdx).toBeGreaterThan(-1);
    const withStepsBlock = content.slice(withStepsIdx, withStepsIdx + 300);
    expect(withStepsBlock).toContain("approvalSteps");
    expect(withStepsBlock).toContain("ApprovalStepSummary[]");
  });
});

// ---------------------------------------------------------------------------
// TC-022: findAllWithStepsByOrganization — Map ベースグルーピング
// ---------------------------------------------------------------------------

describe("findAllWithStepsByOrganization grouping logic — TC-022", () => {
  /**
   * TC-022: requestRepository.findAllWithStepsByOrganization が
   *         Map ベースのグルーピングで N+1 クエリを回避する
   */
  it("TC-022: function is exported from requestRepository.ts", async () => {
    const content = await readSrc("infrastructure/repositories/requestRepository.ts");
    expect(content).toContain("export async function findAllWithStepsByOrganization");
  });

  it("TC-022: uses leftJoin with approvalSteps table (single JOIN query, no N+1)", async () => {
    const content = await readSrc("infrastructure/repositories/requestRepository.ts");
    const fnIdx = content.indexOf("findAllWithStepsByOrganization");
    expect(fnIdx).toBeGreaterThan(-1);
    const fnBody = content.slice(fnIdx, fnIdx + 1800);
    expect(fnBody).toContain("leftJoin");
    expect(fnBody).toContain("approvalSteps");
  });

  it("TC-022: uses new Map() to group rows by requestId", async () => {
    const content = await readSrc("infrastructure/repositories/requestRepository.ts");
    const fnIdx = content.indexOf("findAllWithStepsByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1800);
    expect(fnBody).toContain("new Map");
    expect(fnBody).toContain("map.has(");
    expect(fnBody).toContain("map.set(");
  });

  it("TC-022: initialises approvalSteps as empty array per request entry", async () => {
    const content = await readSrc("infrastructure/repositories/requestRepository.ts");
    const fnIdx = content.indexOf("findAllWithStepsByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1800);
    expect(fnBody).toContain("approvalSteps: []");
  });

  it("TC-022: pushes step data into approvalSteps only when stepApproverRole is non-null", async () => {
    const content = await readSrc("infrastructure/repositories/requestRepository.ts");
    const fnIdx = content.indexOf("findAllWithStepsByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1800);
    // Guard against null rows from leftJoin
    expect(fnBody).toContain("!== null");
    expect(fnBody).toContain("approvalSteps.push");
  });

  it("TC-022: returns Array.from(map.values()) preserving insertion order", async () => {
    const content = await readSrc("infrastructure/repositories/requestRepository.ts");
    const fnIdx = content.indexOf("findAllWithStepsByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1800);
    expect(fnBody).toContain("Array.from(map.values())");
  });

  it("TC-022: orders results by requests.createdAt and approvalSteps.stepOrder", async () => {
    const content = await readSrc("infrastructure/repositories/requestRepository.ts");
    const fnIdx = content.indexOf("findAllWithStepsByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1800);
    expect(fnBody).toContain("stepOrder");
    expect(fnBody).toContain("orderBy");
  });
});

// ---------------------------------------------------------------------------
// TC-003: BTN_DANGER が定義されている
// TC-004: BTN_SUBMIT が定義されている
// ---------------------------------------------------------------------------

describe("styles.ts constants — TC-003 and TC-004", () => {
  /**
   * TC-003: BTN_DANGER が定義されており
   *         text-danger と underline を含む
   */
  it("TC-003: styles.ts exports BTN_DANGER containing text-danger and underline", async () => {
    const content = await readSrc("app/(dashboard)/styles.ts");
    expect(content).toContain("BTN_DANGER");
    expect(content).toContain("text-danger");
    expect(content).toContain("underline");
  });

  /**
   * TC-004: BTN_SUBMIT が定義されており
   *         bg-primary・text-white・rounded を含む
   */
  it("TC-004: styles.ts exports BTN_SUBMIT containing bg-primary, text-white, and rounded", async () => {
    const content = await readSrc("app/(dashboard)/styles.ts");
    expect(content).toContain("BTN_SUBMIT");
    expect(content).toContain("bg-primary");
    expect(content).toContain("text-white");
    expect(content).toContain("rounded");
    expect(content).not.toContain("rounded-none");
  });
});

// ---------------------------------------------------------------------------
// TC-032: BTN_PRIMARY_DISABLED が定義されている
// ---------------------------------------------------------------------------

describe("styles.ts constants — TC-032 and TC-033", () => {
  /**
   * TC-032: BTN_PRIMARY_DISABLED が定義されており
   *         disabled:cursor-not-allowed を含む
   */
  it("TC-032: styles.ts exports BTN_PRIMARY_DISABLED containing disabled:cursor-not-allowed", async () => {
    const content = await readSrc("app/(dashboard)/styles.ts");
    expect(content).toContain("BTN_PRIMARY_DISABLED");
    expect(content).toContain("disabled:cursor-not-allowed");
  });

  /**
   * TC-033: SELECT_BASE が定義されており
   *         block w-full border border-border rounded を含む
   */
  it("TC-033: styles.ts exports SELECT_BASE containing block w-full border border-border rounded", async () => {
    const content = await readSrc("app/(dashboard)/styles.ts");
    expect(content).toContain("SELECT_BASE");
    expect(content).toContain("block w-full");
    expect(content).toContain("border border-border");
    expect(content).toContain("rounded");
    expect(content).not.toContain("rounded-none");
  });
});

// ---------------------------------------------------------------------------
// ActionItemRow UI パターン — T-10
// ---------------------------------------------------------------------------

describe("ActionItemRow UI パターン — T-10", () => {
  /**
   * ActionItemRow.tsx に updateActionItemAction の呼び出しが含まれる
   */
  it("ActionItemRow.tsx に updateActionItemAction の呼び出しが含まれる", async () => {
    const content = await readSrc("app/(dashboard)/components/ActionItemRow.tsx");
    expect(content).toContain("updateActionItemAction");
  });

  /**
   * ActionItemRow.tsx に deleteActionItemAction の呼び出しが含まれる
   */
  it("ActionItemRow.tsx に deleteActionItemAction の呼び出しが含まれる", async () => {
    const content = await readSrc("app/(dashboard)/components/ActionItemRow.tsx");
    expect(content).toContain("deleteActionItemAction");
  });

  /**
   * ActionItemRow.tsx に ConfirmDialog の使用が含まれる
   */
  it("ActionItemRow.tsx に ConfirmDialog の使用が含まれる", async () => {
    const content = await readSrc("app/(dashboard)/components/ActionItemRow.tsx");
    expect(content).toContain("ConfirmDialog");
  });

  /**
   * ActionItemRow.tsx に toggleActionItemAction の呼び出しが含まれる
   */
  it("ActionItemRow.tsx に toggleActionItemAction の呼び出しが含まれる", async () => {
    const content = await readSrc("app/(dashboard)/components/ActionItemRow.tsx");
    expect(content).toContain("toggleActionItemAction");
  });
});
