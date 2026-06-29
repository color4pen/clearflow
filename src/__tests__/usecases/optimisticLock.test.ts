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
// Contracts / Invoices: optimistic lock — Repository WHERE clause
// ---------------------------------------------------------------------------

describe("Repository: contract/invoice optimistic lock WHERE clause", () => {
  it("contractRepository.update includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/contractRepository.ts");
    expect(src).toContain("eq(contracts.version, expectedVersion)");
  });

  it("invoiceRepository.update includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    expect(src).toContain("eq(invoices.version, expectedVersion)");
  });

  it("invoiceRepository.updateStatus includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // updateStatus function should have eq(invoices.version, expectedVersion)
    const updateStatusIdx = src.indexOf("export async function updateStatus");
    const versionWhereIdx = src.indexOf("eq(invoices.version, expectedVersion)", updateStatusIdx);
    expect(updateStatusIdx).toBeGreaterThan(-1);
    expect(versionWhereIdx).toBeGreaterThan(updateStatusIdx);
  });

  it("contractRepository.update increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/contractRepository.ts");
    expect(src).toContain("version: sql`version + 1`");
  });

  it("invoiceRepository.update increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // update function should have version: sql`version + 1`
    const updateIdx = src.indexOf("export async function update");
    const versionIncrIdx = src.indexOf("version: sql`version + 1`", updateIdx);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(versionIncrIdx).toBeGreaterThan(updateIdx);
  });

  it("invoiceRepository.updateStatus increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    const updateStatusIdx = src.indexOf("export async function updateStatus");
    const versionIncrIdx = src.indexOf("version: sql`version + 1`", updateStatusIdx);
    expect(updateStatusIdx).toBeGreaterThan(-1);
    expect(versionIncrIdx).toBeGreaterThan(updateStatusIdx);
  });

  it("contractRepository.mapRow includes version field", async () => {
    const src = await readSrc("infrastructure/repositories/contractRepository.ts");
    expect(src).toContain("version: row.version");
  });

  it("invoiceRepository.mapRow includes version field", async () => {
    const src = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    expect(src).toContain("version: row.version");
  });
});

// ---------------------------------------------------------------------------
// Contracts / Invoices: optimistic lock — Usecase version passing
// ---------------------------------------------------------------------------

describe("Usecase: contract/invoice version passed to repository", () => {
  it("updateContract passes contract.version to contractRepository.update", async () => {
    const src = await readSrc("application/usecases/updateContract.ts");
    expect(src).toContain("contract.version");
    expect(src).toContain("contractRepository.update");
  });

  it("updateContractStatus passes contract.version to contractRepository.update", async () => {
    const src = await readSrc("application/usecases/updateContractStatus.ts");
    expect(src).toContain("contract.version");
    expect(src).toContain("contractRepository.update");
  });

  it("updateInvoice passes invoice.version to invoiceRepository.update (not freshInvoice.version)", async () => {
    const src = await readSrc("application/usecases/updateInvoice.ts");
    // Should reference invoice.version
    expect(src).toContain("invoice.version");
    // freshInvoice.version should NOT be passed as expectedVersion
    expect(src).not.toContain("freshInvoice.version");
  });

  it("updateInvoiceStatus passes invoice.version to invoiceRepository.updateStatus", async () => {
    const src = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(src).toContain("invoice.version");
    expect(src).toContain("invoiceRepository.updateStatus");
  });
});

// ---------------------------------------------------------------------------
// Contracts / Invoices: optimistic lock failure message
// ---------------------------------------------------------------------------

describe("Usecase: contract/invoice optimistic lock failure message", () => {
  const CONTRACT_MESSAGE = "この契約は他のユーザーによって更新されました";
  const INVOICE_MESSAGE = "この請求は他のユーザーによって更新されました";

  it("updateContract contains contract optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/updateContract.ts");
    expect(src).toContain(CONTRACT_MESSAGE);
  });

  it("updateContractStatus contains contract optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/updateContractStatus.ts");
    expect(src).toContain(CONTRACT_MESSAGE);
  });

  it("updateInvoice contains invoice optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/updateInvoice.ts");
    expect(src).toContain(INVOICE_MESSAGE);
  });

  it("updateInvoiceStatus contains invoice optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(src).toContain(INVOICE_MESSAGE);
  });
});

// ---------------------------------------------------------------------------
// Contracts / Invoices: Domain model version field
// ---------------------------------------------------------------------------

describe("Domain model: contract/invoice version field", () => {
  it("Contract type has version: number field", async () => {
    const src = await readSrc("domain/models/contract.ts");
    expect(src).toContain("version: number");
  });

  it("Invoice type has version: number field", async () => {
    const src = await readSrc("domain/models/invoice.ts");
    expect(src).toContain("version: number");
  });
});

// ---------------------------------------------------------------------------
// Contracts / Invoices: Schema version columns
// ---------------------------------------------------------------------------

describe("Schema: contract/invoice version columns", () => {
  it("contracts table has version column in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const contractsTableStart = src.indexOf('pgTable(\n  "contracts"');
    const contractsTableEnd = src.indexOf(");", contractsTableStart);
    const contractsTable = src.substring(contractsTableStart, contractsTableEnd);
    expect(contractsTable).toContain('integer("version")');
    expect(contractsTable).toContain(".notNull()");
    expect(contractsTable).toContain(".default(1)");
  });

  it("invoices table has version column in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const invoicesTableStart = src.indexOf('pgTable("invoices"');
    const invoicesTableEnd = src.indexOf("});", invoicesTableStart);
    const invoicesTable = src.substring(invoicesTableStart, invoicesTableEnd);
    expect(invoicesTable).toContain('integer("version")');
    expect(invoicesTable).toContain(".notNull()");
    expect(invoicesTable).toContain(".default(1)");
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

// ---------------------------------------------------------------------------
// Schema: version columns (meetings / action_items / revenue_targets)
// ---------------------------------------------------------------------------

describe("Schema: version columns (remaining entities)", () => {
  it("interactions table has version column in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const interactionsTableStart = src.indexOf('pgTable(\n  "interactions"');
    const interactionsTableEnd = src.indexOf(");", interactionsTableStart);
    const interactionsTable = src.substring(interactionsTableStart, interactionsTableEnd);
    expect(interactionsTable).toContain('integer("version")');
    expect(interactionsTable).toContain(".notNull()");
    expect(interactionsTable).toContain(".default(1)");
  });

  it("action_items table has version column in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const actionItemsTableStart = src.indexOf('pgTable(\n  "action_items"');
    const actionItemsTableEnd = src.indexOf(");", actionItemsTableStart);
    const actionItemsTable = src.substring(actionItemsTableStart, actionItemsTableEnd);
    expect(actionItemsTable).toContain('integer("version")');
    expect(actionItemsTable).toContain(".notNull()");
    expect(actionItemsTable).toContain(".default(1)");
  });

  it("revenue_targets table has version column in schema.ts", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    const revenueTargetsTableStart = src.indexOf('pgTable("revenue_targets"');
    const revenueTargetsTableEnd = src.indexOf("});", revenueTargetsTableStart);
    const revenueTargetsTable = src.substring(revenueTargetsTableStart, revenueTargetsTableEnd);
    expect(revenueTargetsTable).toContain('integer("version")');
    expect(revenueTargetsTable).toContain(".notNull()");
    expect(revenueTargetsTable).toContain(".default(1)");
  });
});

// ---------------------------------------------------------------------------
// Domain model: version field (meetings / action_items / revenue_targets)
// ---------------------------------------------------------------------------

describe("Domain model: version field (remaining entities)", () => {
  it("Interaction type has version: number field", async () => {
    const src = await readSrc("domain/models/interaction.ts");
    expect(src).toContain("version: number");
  });

  it("ActionItem type has version: number field", async () => {
    const src = await readSrc("domain/models/actionItem.ts");
    expect(src).toContain("version: number");
  });

  it("RevenueTarget type has version: number field", async () => {
    const src = await readSrc("domain/models/revenueTarget.ts");
    expect(src).toContain("version: number");
  });
});

// ---------------------------------------------------------------------------
// Repository: optimistic lock WHERE clause (meetings / action_items / revenue_targets)
// ---------------------------------------------------------------------------

describe("Repository: optimistic lock WHERE clause (remaining entities)", () => {
  it("interactionRepository.update includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/interactionRepository.ts");
    expect(src).toContain("eq(interactions.version, expectedVersion)");
  });

  it("actionItemRepository.update includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/actionItemRepository.ts");
    expect(src).toContain("eq(actionItems.version, expectedVersion)");
  });

  it("revenueTargetRepository.update includes version in WHERE condition", async () => {
    const src = await readSrc("infrastructure/repositories/revenueTargetRepository.ts");
    expect(src).toContain("eq(revenueTargets.version, expectedVersion)");
  });

  it("interactionRepository.update increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/interactionRepository.ts");
    expect(src).toContain("version: sql`version + 1`");
  });

  it("actionItemRepository.update increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/actionItemRepository.ts");
    expect(src).toContain("version: sql`version + 1`");
  });

  it("revenueTargetRepository.update increments version on update", async () => {
    const src = await readSrc("infrastructure/repositories/revenueTargetRepository.ts");
    expect(src).toContain("version: sql`version + 1`");
  });

  it("interactionRepository.mapRow includes version field", async () => {
    const src = await readSrc("infrastructure/repositories/interactionRepository.ts");
    expect(src).toContain("version: row.version");
  });

  it("actionItemRepository.mapRow includes version field", async () => {
    const src = await readSrc("infrastructure/repositories/actionItemRepository.ts");
    expect(src).toContain("version: row.version");
  });

  it("revenueTargetRepository.mapRow includes version field", async () => {
    const src = await readSrc("infrastructure/repositories/revenueTargetRepository.ts");
    expect(src).toContain("version: row.version");
  });
});

// ---------------------------------------------------------------------------
// Usecase: version passed to repository (remaining entities)
// ---------------------------------------------------------------------------

describe("Usecase: version passed to repository (remaining entities)", () => {
  it("updateMeeting passes existing.version to interactionRepository.update", async () => {
    const src = await readSrc("application/usecases/updateMeeting.ts");
    expect(src).toContain("existing.version");
    expect(src).toContain("interactionRepository.update");
  });

  it("updateActionItem passes existing.version to actionItemRepository.update", async () => {
    const src = await readSrc("application/usecases/updateActionItem.ts");
    expect(src).toContain("existing.version");
    expect(src).toContain("actionItemRepository.update");
  });

  it("toggleActionItemDone passes existing.version to actionItemRepository.update", async () => {
    const src = await readSrc("application/usecases/toggleActionItemDone.ts");
    expect(src).toContain("existing.version");
    expect(src).toContain("actionItemRepository.update");
  });

  it("updateRevenueTarget passes existing.version to revenueTargetRepository.update", async () => {
    const src = await readSrc("application/usecases/updateRevenueTarget.ts");
    expect(src).toContain("existing.version");
    expect(src).toContain("revenueTargetRepository.update");
  });
});

// ---------------------------------------------------------------------------
// Usecase: optimistic lock failure message (remaining entities)
// ---------------------------------------------------------------------------

describe("Usecase: optimistic lock failure message (remaining entities)", () => {
  it("updateMeeting contains meeting optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/updateMeeting.ts");
    expect(src).toContain("この商談は他のユーザーによって更新されました");
  });

  it("updateActionItem contains action item optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/updateActionItem.ts");
    expect(src).toContain("このアクションアイテムは他のユーザーによって更新されました");
  });

  it("toggleActionItemDone contains action item optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/toggleActionItemDone.ts");
    expect(src).toContain("このアクションアイテムは他のユーザーによって更新されました");
  });

  it("updateRevenueTarget contains revenue target optimistic lock failure message", async () => {
    const src = await readSrc("application/usecases/updateRevenueTarget.ts");
    expect(src).toContain("この売上目標は他のユーザーによって更新されました");
  });
});
