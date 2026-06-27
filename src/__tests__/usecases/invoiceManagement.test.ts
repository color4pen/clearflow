/**
 * 請求管理ユースケースの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// updateInvoiceStatus — TC-004, TC-005, TC-006
// ---------------------------------------------------------------------------

describe("updateInvoiceStatus usecase 静的検証", () => {
  /**
   * TC-004: paidAt 指定で入金確認
   * updateInvoiceStatus が paidAt パラメータを受け取り、paid 遷移時に使用する
   */
  it("TC-004: paidAt パラメータが定義されている", async () => {
    const content = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(content).toContain("paidAt");
    expect(content).toContain("paidAt?: Date");
  });

  /**
   * TC-005: paidAt 未指定で入金確認（現在日時フォールバック）
   * paidAt 未指定時に new Date() をフォールバックとして使用する
   */
  it("TC-005: paidAt 未指定時に new Date() がフォールバックとして使用される", async () => {
    const content = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(content).toContain("data.paidAt ?? new Date()");
  });

  /**
   * TC-006: overdue から paidAt 指定で入金確認（ドメインイベント含む）
   * paid 遷移時に invoice.paid ドメインイベントが dispatch される
   */
  it("TC-006: paid 遷移時に invoice.paid ドメインイベントが dispatch される", async () => {
    const content = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(content).toContain('"invoice.paid"');
    expect(content).toContain("dispatcher.dispatch");
    const paidEventIdx = content.indexOf('"invoice.paid"');
    const dispatchIdx = content.lastIndexOf("dispatcher.dispatch", paidEventIdx + 1);
    expect(dispatchIdx).toBeGreaterThan(-1);
  });

  it("TC-006: updateInvoiceStatus が validateInvoiceTransition を呼び出す（overdue→paid 遷移バリデーション）", async () => {
    const content = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(content).toContain("validateInvoiceTransition");
    const validateIdx = content.indexOf("validateInvoiceTransition");
    const updateStatusIdx = content.indexOf("updateStatus");
    expect(validateIdx).toBeLessThan(updateStatusIdx);
  });
});

// ---------------------------------------------------------------------------
// getInvoice — TC-007, TC-008, TC-009
// ---------------------------------------------------------------------------

describe("getInvoice usecase 静的検証", () => {
  /**
   * TC-007: 存在する請求を取得
   * getInvoice が invoice と contract を両方返す
   */
  it("TC-007: getInvoice が invoice と contract を返す", async () => {
    const content = await readSrc("application/usecases/getInvoice.ts");
    expect(content).toContain("invoice");
    expect(content).toContain("contract");
    expect(content).toContain("return { invoice, contract }");
  });

  /**
   * TC-008: 存在しない請求を取得
   * getInvoice が invoice not found の場合に null を返す
   */
  it("TC-008: 請求が存在しない場合に null を返す", async () => {
    const content = await readSrc("application/usecases/getInvoice.ts");
    expect(content).toContain("return null");
    const findByIdIdx = content.indexOf("findById");
    expect(findByIdIdx).toBeGreaterThan(-1);
    const nullReturnIdx = content.indexOf("return null");
    expect(nullReturnIdx).toBeGreaterThan(findByIdIdx);
  });

  /**
   * TC-009: 異なる organizationId での取得拒否（マルチテナント分離）
   * invoiceRepository.findById が organizationId を引数として受け取る
   */
  it("TC-009: findById が organizationId を引数として使用する（マルチテナント分離）", async () => {
    const content = await readSrc("application/usecases/getInvoice.ts");
    expect(content).toContain("data.organizationId");
    expect(content).toContain("findById");
    const findByIdIdx = content.indexOf("findById");
    const orgIdAfterFind = content.indexOf("organizationId", findByIdIdx);
    expect(orgIdAfterFind).toBeGreaterThan(-1);
  });

  it("TC-009: invoiceRepository.findById が organizationId フィルタを持つ", async () => {
    const repoContent = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // findById の WHERE 条件に organizationId が含まれる
    const findByIdIdx = repoContent.indexOf("async function findById");
    expect(findByIdIdx).toBeGreaterThan(-1);
    const orgIdIdx = repoContent.indexOf("organizationId", findByIdIdx);
    expect(orgIdIdx).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// 請求詳細ページ — TC-011
// ---------------------------------------------------------------------------

describe("請求詳細ページ 静的検証", () => {
  /**
   * TC-011: contractId 不一致で 404
   * URL の contractId と請求の contractId が一致しない場合に notFound() が呼ばれる
   */
  it("TC-011: invoice.contractId と URL の contractId が不一致の場合に notFound() を呼ぶ", async () => {
    const content = await readSrc(
      "app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx"
    );
    expect(content).toContain("invoice.contractId !== contractId");
    expect(content).toContain("notFound()");
    const mismatchIdx = content.indexOf("invoice.contractId !== contractId");
    const notFoundIdx = content.indexOf("notFound()", mismatchIdx);
    expect(notFoundIdx).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// Server Action: updateInvoiceStatusAction — TC-022, TC-034
// ---------------------------------------------------------------------------

describe("updateInvoiceStatusAction Server Action 静的検証", () => {
  /**
   * TC-022: 未来日付の入金日は拒否
   * paidAt の refine バリデーションが本日以前の日付のみ受け入れる
   */
  it("TC-022: paidAt の refine バリデーションが JST 基準の本日以前を検証する", async () => {
    const content = await readSrc("app/actions/invoices.ts");
    // JST 基準の日付比較が含まれる
    expect(content).toContain("Asia/Tokyo");
    expect(content).toContain("入金日は本日以前の日付を指定してください");
  });

  /**
   * TC-034: ステータス更新後の revalidatePath
   * updateInvoiceStatusAction が成功時に両パスに対して revalidatePath を呼び出す
   */
  it("TC-034: 成功時に /contracts/{contractId} パスを revalidatePath する", async () => {
    const content = await readSrc("app/actions/invoices.ts");
    const actionIdx = content.indexOf("updateInvoiceStatusAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterAction = content.slice(actionIdx);
    expect(afterAction).toContain("revalidatePath");
    expect(afterAction).toContain("`/contracts/${contractId}`");
  });

  it("TC-034: 成功時に /contracts/{contractId}/invoices/{invoiceId} パスを revalidatePath する", async () => {
    const content = await readSrc("app/actions/invoices.ts");
    const actionIdx = content.indexOf("updateInvoiceStatusAction");
    expect(actionIdx).toBeGreaterThan(-1);
    const afterAction = content.slice(actionIdx);
    expect(afterAction).toContain("`/contracts/${contractId}/invoices/${invoiceId}`");
  });
});

// ---------------------------------------------------------------------------
// createInvoice usecase — TC-023, TC-027
// ---------------------------------------------------------------------------

describe("createInvoice usecase 静的検証", () => {
  /**
   * TC-023: 請求の新規作成
   * createInvoice が invoiceRepository.create を呼び出し監査ログを記録する
   */
  it("TC-023: invoiceRepository.create の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/createInvoice.ts");
    expect(content).toContain("invoiceRepository.create");
  });

  it("TC-023: recordAudit の呼び出しが含まれる（監査ログ記録）", async () => {
    const content = await readSrc("application/usecases/createInvoice.ts");
    expect(content).toContain("recordAudit");
    expect(content).toContain('"invoice.create"');
  });

  it("TC-023: db.transaction の呼び出しが含まれる（トランザクション内処理）", async () => {
    const content = await readSrc("application/usecases/createInvoice.ts");
    expect(content).toContain("db.transaction");
  });

  /**
   * TC-027: 合計が契約金額を超過する入力でエラー
   * one_time 契約で既存合計 + 追加金額 > 契約金額の場合にエラーを返す
   */
  it("TC-027: one_time 契約での合計超過チェックが含まれる", async () => {
    const content = await readSrc("application/usecases/createInvoice.ts");
    expect(content).toContain("one_time");
    expect(content).toContain("existingTotal + data.amount > contract.amount");
  });

  it("TC-027: sumAmountByContract の呼び出しが含まれる（既存合計取得）", async () => {
    const content = await readSrc("application/usecases/createInvoice.ts");
    expect(content).toContain("sumAmountByContract");
  });
});
