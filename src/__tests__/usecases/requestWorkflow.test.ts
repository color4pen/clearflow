/**
 * Request workflow tests — usecase layer
 *
 * These tests verify the usecase implementation via static code analysis
 * (reading source files and confirming expected patterns).
 * Integration tests that require a live DB connection are marked as such.
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// Usecase orchestration — TC-039, TC-040
// ---------------------------------------------------------------------------

describe("Usecase orchestration", () => {
  /**
   * TC-039: approveRequest / rejectRequest が validateTransition を
   *         呼び出してから状態更新する
   */
  it("TC-039: approveRequest calls validateTransition before updateStatus", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    const validateIdx = src.indexOf("validateTransition");
    const updateIdx = src.indexOf("updateStatus");
    expect(validateIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    // validateTransition must appear before updateStatus in the source
    expect(validateIdx).toBeLessThan(updateIdx);
  });

  it("TC-039: rejectRequest calls validateTransition before updateStatus", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    const validateIdx = src.indexOf("validateTransition");
    const updateIdx = src.indexOf("updateStatus");
    expect(validateIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(validateIdx).toBeLessThan(updateIdx);
  });

  /**
   * TC-040: submitRequest が validateTransition(draft → pending) を呼び出す
   */
  it("TC-040: submitRequest calls validateTransition with pending target", async () => {
    const src = await readSrc("application/usecases/submitRequest.ts");
    expect(src).toContain("validateTransition");
    expect(src).toContain('"pending"');
    const validateIdx = src.indexOf("validateTransition");
    const updateIdx = src.indexOf("updateStatus");
    expect(validateIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(-1);
    expect(validateIdx).toBeLessThan(updateIdx);
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — TC-007 to TC-010
// ---------------------------------------------------------------------------

describe("Tenant isolation — repository queries", () => {
  /**
   * TC-007: 申請一覧取得でテナント分離が適用される
   * TC-010: requestRepository クエリに organizationId 条件が付与される
   */
  it("TC-007 TC-010: findAllByOrganization filters by organizationId", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // findAllByOrganization should include organizationId in its WHERE clause
    const fnIdx = src.indexOf("findAllByOrganization");
    expect(fnIdx).toBeGreaterThan(-1);
    // organizationId must appear after the function definition
    const orgIdIdx = src.indexOf("organizationId", fnIdx);
    expect(orgIdIdx).toBeGreaterThan(-1);
  });

  /**
   * TC-008: 申請詳細取得でテナント分離が適用される
   */
  it("TC-008: findById includes organizationId condition", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // findById(id, organizationId) must use both conditions
    expect(src).toContain("findById");
    const findByIdIdx = src.indexOf("findById");
    const andIdx = src.indexOf("and(", findByIdIdx);
    expect(andIdx).toBeGreaterThan(-1); // uses AND for both id and organizationId
  });

  /**
   * TC-009: 申請作成時に organizationId はセッションから取得される
   */
  it("TC-009: createRequestAction takes organizationId from session, not request body", async () => {
    const src = await readSrc("app/actions/requests.ts");
    // organizationId must come from session.user, not from formData
    expect(src).toContain("session.user.organizationId");
    // Must NOT read organizationId from formData
    expect(src).not.toContain('formData.get("organizationId")');
  });

  /**
   * TC-010: updateStatus も organizationId 条件が付与される
   */
  it("TC-010: updateStatus includes organizationId condition", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    const updateIdx = src.indexOf("updateStatus");
    expect(updateIdx).toBeGreaterThan(-1);
    // organizationId should appear in the update function
    const orgIdx = src.indexOf("organizationId", updateIdx);
    expect(orgIdx).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// Audit logs — TC-011 to TC-013
// ---------------------------------------------------------------------------

describe("Audit logs", () => {
  /**
   * TC-011: 申請提出時に監査ログが作成される
   * 監査ログはハンドラ経由で自動記録される (auditLogHandler)
   */
  it("TC-011: submitRequest records audit log via auditLogHandler with action=request.submit", async () => {
    // submitRequest dispatches the event; auditLogHandler records the audit log
    const submitSrc = await readSrc("application/usecases/submitRequest.ts");
    expect(submitSrc).toContain("dispatcher.dispatch");
    expect(submitSrc).toContain('"request.submitted"');
    expect(submitSrc).not.toContain("auditLogRepository");

    // auditLogHandler records action=request.submit for request.submitted events
    const handlerSrc = await readSrc("infrastructure/handlers/auditLogHandler.ts");
    expect(handlerSrc).toContain("recordAudit");
    expect(handlerSrc).toContain("request.submit");
    expect(handlerSrc).toContain("targetType");
    expect(handlerSrc).toContain("actorId");
  });

  /**
   * TC-012: 申請承認時に監査ログが作成される
   */
  it("TC-012: approveRequest creates audit log with action=request.approve", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("recordAudit");
    expect(src).toContain("request.approve");
    expect(src).toContain("targetType");
    expect(src).toContain("actorId");
  });

  /**
   * TC-013: 申請却下時に監査ログが作成される
   */
  it("TC-013: rejectRequest creates audit log with action=request.reject", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain("recordAudit");
    expect(src).toContain("request.reject");
    expect(src).toContain("targetType");
    expect(src).toContain("actorId");
  });
});

// ---------------------------------------------------------------------------
// Authorization — TC-017 to TC-020, TC-023
// ---------------------------------------------------------------------------

describe("Authorization in Server Actions", () => {
  /**
   * TC-017: 未認証での申請作成が拒否される
   */
  it("TC-017: createRequestAction rejects unauthenticated requests", async () => {
    const src = await readSrc("app/actions/requests.ts");
    // auth() must be called and session must be checked before usecase
    expect(src).toContain("await auth()");
    // Null session must be handled before createRequest is called
    const authIdx = src.indexOf("await auth()");
    const createIdx = src.indexOf("createRequest(");
    expect(authIdx).toBeLessThan(createIdx);
  });

  /**
   * TC-018: manager/finance が申請を承認できる
   * TC-019: member が申請を承認しようとすると拒否される
   */
  it("TC-018 TC-019: approveRequestAction rejects member role", async () => {
    const src = await readSrc("app/actions/requests.ts");
    // approveRequestAction must check role before calling usecase
    expect(src).toContain('session.user.role === "member"');
  });

  /**
   * TC-020: member が申請を却下しようとすると拒否される
   */
  it("TC-020: rejectRequestAction rejects member role", async () => {
    const src = await readSrc("app/actions/requests.ts");
    expect(src).toContain('session.user.role === "member"');
    // rejectRequest usecase should only be called after the role check
    const roleCheckIdx = src.lastIndexOf('role === "member"');
    const rejectIdx = src.indexOf("rejectRequest(");
    expect(roleCheckIdx).toBeLessThan(rejectIdx);
  });

  /**
   * TC-023: approveRequestAction と rejectRequestAction で member ロールの拒否チェックが行われる
   */
  it("TC-023: member role rejection check present in approveRequestAction and rejectRequestAction", async () => {
    const src = await readSrc("app/actions/requests.ts");
    expect(src).toContain("approveRequestAction");
    expect(src).toContain("rejectRequestAction");
    // Both actions reference the member role check
    const memberCheckCount = (src.match(/role === "member"/g) || []).length;
    expect(memberCheckCount).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Multi-stage approval — TC-060 to TC-063
// ---------------------------------------------------------------------------

describe("Multi-stage approval usecase structure", () => {
  /**
   * TC-060: resubmitRequest usecase が存在し validateTransition を呼び出す
   */
  it("TC-060: resubmitRequest usecase exists and calls validateTransition", async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    expect(src).toContain("validateTransition");
  });

  /**
   * TC-061: resubmitRequest usecase が db.transaction を使用する
   */
  it("TC-061: resubmitRequest usecase uses db.transaction", async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    expect(src).toContain("db.transaction");
  });

  /**
   * TC-062: resubmitRequest usecase が auditLogRepository を使用する
   */
  it("TC-062: resubmitRequest usecase uses recordAudit", async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    expect(src).toContain("recordAudit");
  });

  /**
   * TC-063: approveRequest usecase が approvalStepRepository を使用する
   */
  it("TC-063: approveRequest usecase uses approvalStepRepository", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("approvalStepRepository");
  });
});

// ---------------------------------------------------------------------------
// Request creation — TC-024
// ---------------------------------------------------------------------------

describe("Request creation", () => {
  /**
   * TC-024: 新規申請が draft ステータスで作成される
   */
  it("TC-024: requestRepository.create sets initial status to draft", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    expect(src).toContain("create");
    // Initial status must be "draft"
    expect(src).toContain('"draft"');
    // In the create function, status should be hardcoded to "draft"
    const createFnIdx = src.indexOf("export async function create");
    const draftIdx = src.indexOf('"draft"', createFnIdx);
    expect(draftIdx).toBeGreaterThan(-1);
  });

  /**
   * TC-024b: createRequest usecase が templateId と formData を受け取る
   * テンプレートはユーザーが手動選択する方式に変更された
   */
  it("TC-024b: createRequest usecase uses templateId and formData instead of amount-based auto selection", async () => {
    const src = await readSrc("application/usecases/createRequest.ts");
    // Must accept templateId as required field
    expect(src).toContain("templateId: string");
    // Must accept formData
    expect(src).toContain("formData");
    // Must NOT call findByOrganizationForAmount (deleted)
    expect(src).not.toContain("findByOrganizationForAmount");
    // Must NOT use selectTemplate domain service (deleted)
    expect(src).not.toContain("selectTemplate");
    // Must call filterStepsByCondition for conditional step filtering
    expect(src).toContain("filterStepsByCondition");
    // Must use findById to get the template
    expect(src).toContain("findById");
    // Must include templateId and templateName in audit log metadata
    expect(src).toContain("templateId: selectedTemplate.id");
    expect(src).toContain("templateName: selectedTemplate.name");
  });
});

// ---------------------------------------------------------------------------
// Backward-compatible approval (no steps) — TC-030
// ---------------------------------------------------------------------------

describe("Backward-compatible single-step approval", () => {
  /**
   * TC-030: ステップなし申請の承認（後方互換）
   * When a request has no approval steps, approveRequest transitions it
   * directly to "approved" without requiring a current step.
   */
  it("TC-030: approveRequest handles empty steps with direct approved transition", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    // Must check steps.length === 0 for the backward-compatible path
    expect(src).toContain("steps.length === 0");
    // The no-steps path must transition directly to "approved"
    const noStepsIdx = src.indexOf("steps.length === 0");
    const approvedIdx = src.indexOf('"approved"', noStepsIdx);
    expect(approvedIdx).toBeGreaterThan(-1);
    // Must still record an audit log in the no-steps path
    const auditIdx = src.indexOf("recordAudit", noStepsIdx);
    expect(auditIdx).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// Resubmit partial reset — TC-037, TC-038
// ---------------------------------------------------------------------------

describe("Resubmit partial step reset", () => {
  /**
   * TC-037: 2 段階目で差し戻された後の再申請
   * When step 2 was rejected, only steps with stepOrder >= 2 are reset.
   * Steps before the rejected step (stepOrder < 2) stay approved.
   */
  it("TC-037: resubmitRequest finds rejected step and resets steps from that order onward", async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    // Must find the rejected step
    expect(src).toContain('status === "rejected"');
    // Must call getStepsToReset with the rejected step's stepOrder
    expect(src).toContain("getStepsToReset");
    expect(src).toContain("rejectedStep.stepOrder");
    // Must call resetSteps to apply the partial reset
    expect(src).toContain("resetSteps");
  });

  /**
   * TC-038: 1 段階目で差し戻された後の再申請
   * When step 1 was rejected (first step), getStepsToReset returns all steps,
   * so all steps are reset on resubmission.
   * The same code path handles this correctly since stepOrder >= 1 covers all steps.
   */
  it("TC-038: resubmitRequest resets all steps when the first step is rejected", async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    // getStepsToReset is used with rejectedStep.stepOrder
    // When stepOrder is 1 (the first step), all steps satisfy stepOrder >= 1
    expect(src).toContain("getStepsToReset");
    expect(src).toContain("rejectedStep.stepOrder");
    // resetSteps is called with that stepOrder
    const resetStepsIdx = src.indexOf("resetSteps");
    const stepOrderAfterReset = src.indexOf("stepOrder", resetStepsIdx);
    expect(stepOrderAfterReset).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// Server Action: listApprovalTemplatesAction removed — TC-047
// ---------------------------------------------------------------------------

describe("Server Action: listApprovalTemplatesAction removed", () => {
  /**
   * TC-047: listApprovalTemplatesAction はテンプレート手動選択の廃止に伴い削除された。
   * 代わりに listTemplatesForRequestAction が追加されている（admin 権限不要）。
   */
  it("TC-047: listApprovalTemplatesAction does not exist in requests.ts (removed with template auto-selection)", async () => {
    const src = await readSrc("app/actions/requests.ts");
    // listApprovalTemplatesAction must NOT exist (it was the old auto-selection related action)
    expect(src).not.toContain("listApprovalTemplatesAction");
  });

  it("TC-047b: listTemplatesForRequestAction exists in requests.ts without admin guard", async () => {
    const src = await readSrc("app/actions/requests.ts");
    // The new action for template listing (no admin role required) must exist
    expect(src).toContain("listTemplatesForRequestAction");
    // It should NOT have an admin role guard
    const actionIdx = src.indexOf("listTemplatesForRequestAction");
    const actionBody = src.slice(actionIdx, actionIdx + 300);
    expect(actionBody).not.toContain('role !== "admin"');
  });
});

// ---------------------------------------------------------------------------
// bulkApproveAction Server Action — bulk-approval feature
// ---------------------------------------------------------------------------

describe("bulkApproveAction Server Action", () => {
  it("bulkApproveAction exists in requests.ts", async () => {
    const src = await readSrc("app/actions/requests.ts");
    expect(src).toContain("bulkApproveAction");
  });

  it("bulkApproveAction calls auth() for authentication", async () => {
    const src = await readSrc("app/actions/requests.ts");
    const bulkIdx = src.indexOf("bulkApproveAction");
    expect(bulkIdx).toBeGreaterThan(-1);
    const bulkBody = src.slice(bulkIdx);
    expect(bulkBody).toContain("await auth()");
  });

  it("bulkApproveAction checks for member role", async () => {
    const src = await readSrc("app/actions/requests.ts");
    const bulkIdx = src.indexOf("async function bulkApproveAction");
    expect(bulkIdx).toBeGreaterThan(-1);
    const bulkBody = src.slice(bulkIdx);
    expect(bulkBody).toContain('role === "member"');
  });

  it("requests.ts contains requestIds upper limit of 20", async () => {
    const src = await readSrc("app/actions/requests.ts");
    const bulkIdx = src.indexOf("bulkApproveAction");
    expect(bulkIdx).toBeGreaterThan(-1);
    // The number 20 must appear in the context of bulk approve validation
    const bulkSection = src.slice(bulkIdx);
    expect(bulkSection).toContain("20");
  });

  it("bulkApproveAction is exported from requests.ts", async () => {
    const src = await readSrc("app/actions/requests.ts");
    expect(src).toContain("export async function bulkApproveAction");
  });
});
