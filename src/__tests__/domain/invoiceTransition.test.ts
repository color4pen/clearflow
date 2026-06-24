import { describe, it, expect } from "bun:test";
import { validateInvoiceTransition } from "@/domain/services/invoiceTransition";

describe("invoiceTransition", () => {
  it("TC-001: scheduled → invoiced が許可される", () => {
    // 準備 - scheduled ステータスから invoiced への遷移
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("scheduled", "invoiced");
    // 検証 - ok: true が返る
    expect(result).toEqual({ ok: true });
  });

  it("TC-002: invoiced → paid が許可される", () => {
    // 準備 - invoiced ステータスから paid への遷移
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("invoiced", "paid");
    // 検証 - ok: true が返る
    expect(result).toEqual({ ok: true });
  });

  it("TC-003: invoiced → overdue が許可される", () => {
    // 準備 - invoiced ステータスから overdue への遷移
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("invoiced", "overdue");
    // 検証 - ok: true が返る
    expect(result).toEqual({ ok: true });
  });

  it("TC-004: scheduled → paid が拒否される", () => {
    // 準備 - scheduled ステータスから paid への遷移（スキップ不可）
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("scheduled", "paid");
    // 検証 - ok: false が返る
    expect(result.ok).toBe(false);
  });

  it("TC-005: paid → invoiced が拒否される（終端状態）", () => {
    // 準備 - paid ステータスからの遷移（終端）
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("paid", "invoiced");
    // 検証 - ok: false が返る
    expect(result.ok).toBe(false);
  });

  it("TC-006: overdue → scheduled が拒否される（終端状態）", () => {
    // 準備 - overdue ステータスからの遷移（終端）
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("overdue", "scheduled");
    // 検証 - ok: false が返る
    expect(result.ok).toBe(false);
  });

  it("TC-007: overdue → paid が許可される（遅延入金確認）", () => {
    // 準備 - overdue ステータスから paid への遷移（遅延入金）
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("overdue", "paid");
    // 検証 - ok: true が返る
    expect(result).toEqual({ ok: true });
  });

  it("TC-008: overdue → invoiced が拒否される", () => {
    // 準備 - overdue ステータスから invoiced への遷移（不正な逆戻り）
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("overdue", "invoiced");
    // 検証 - ok: false が返る
    expect(result.ok).toBe(false);
  });

  it("TC-009: paid → overdue が拒否される（終端状態）", () => {
    // 準備 - paid ステータスから overdue への遷移（終端から逆戻り）
    // 実行 - validateInvoiceTransition を呼び出す
    const result = validateInvoiceTransition("paid", "overdue");
    // 検証 - ok: false が返る
    expect(result.ok).toBe(false);
  });
});
