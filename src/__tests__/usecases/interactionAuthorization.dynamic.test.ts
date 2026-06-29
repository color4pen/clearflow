/**
 * interaction エンティティの認可テスト。
 * canPerform を実行して contract_adjustment / invoice_adjustment の認可ルールを検証する。
 */

import { describe, it, expect } from "bun:test";
import { canPerform } from "@/domain/authorization";

// ---------------------------------------------------------------------------
// 契約調整の記録: admin / manager / member → true、finance → false
// ---------------------------------------------------------------------------

describe("canPerform interaction.recordContractAdjustment", () => {
  it("admin は recordContractAdjustment を実行できる", () => {
    expect(canPerform("admin", "interaction", "recordContractAdjustment")).toBe(true);
  });

  it("manager は recordContractAdjustment を実行できる", () => {
    expect(canPerform("manager", "interaction", "recordContractAdjustment")).toBe(true);
  });

  it("member は recordContractAdjustment を実行できる", () => {
    expect(canPerform("member", "interaction", "recordContractAdjustment")).toBe(true);
  });

  it("finance は recordContractAdjustment を実行できない", () => {
    expect(canPerform("finance", "interaction", "recordContractAdjustment")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 請求調整の記録: admin / manager / finance → true、member → false
// ---------------------------------------------------------------------------

describe("canPerform interaction.recordInvoiceAdjustment", () => {
  it("admin は recordInvoiceAdjustment を実行できる", () => {
    expect(canPerform("admin", "interaction", "recordInvoiceAdjustment")).toBe(true);
  });

  it("manager は recordInvoiceAdjustment を実行できる", () => {
    expect(canPerform("manager", "interaction", "recordInvoiceAdjustment")).toBe(true);
  });

  it("finance は recordInvoiceAdjustment を実行できる", () => {
    expect(canPerform("finance", "interaction", "recordInvoiceAdjustment")).toBe(true);
  });

  it("member は recordInvoiceAdjustment を実行できない", () => {
    expect(canPerform("member", "interaction", "recordInvoiceAdjustment")).toBe(false);
  });
});
