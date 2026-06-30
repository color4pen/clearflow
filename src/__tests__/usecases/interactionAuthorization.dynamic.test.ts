/**
 * interaction エンティティの認可テスト。
 * canPerform を実行して recordContractInteraction / recordInvoiceInteraction の認可ルールを検証する。
 */

import { describe, it, expect } from "bun:test";
import { canPerform } from "@/domain/authorization";

// ---------------------------------------------------------------------------
// 契約に紐づく接点の記録: admin / manager / member → true、finance → false
// ---------------------------------------------------------------------------

describe("canPerform interaction.recordContractInteraction", () => {
  it("admin は recordContractInteraction を実行できる", () => {
    expect(canPerform("admin", "interaction", "recordContractInteraction")).toBe(true);
  });

  it("manager は recordContractInteraction を実行できる", () => {
    expect(canPerform("manager", "interaction", "recordContractInteraction")).toBe(true);
  });

  it("member は recordContractInteraction を実行できる", () => {
    expect(canPerform("member", "interaction", "recordContractInteraction")).toBe(true);
  });

  it("finance は recordContractInteraction を実行できない", () => {
    expect(canPerform("finance", "interaction", "recordContractInteraction")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 請求に紐づく接点の記録: admin / manager / finance → true、member → false
// ---------------------------------------------------------------------------

describe("canPerform interaction.recordInvoiceInteraction", () => {
  it("admin は recordInvoiceInteraction を実行できる", () => {
    expect(canPerform("admin", "interaction", "recordInvoiceInteraction")).toBe(true);
  });

  it("manager は recordInvoiceInteraction を実行できる", () => {
    expect(canPerform("manager", "interaction", "recordInvoiceInteraction")).toBe(true);
  });

  it("finance は recordInvoiceInteraction を実行できる", () => {
    expect(canPerform("finance", "interaction", "recordInvoiceInteraction")).toBe(true);
  });

  it("member は recordInvoiceInteraction を実行できない", () => {
    expect(canPerform("member", "interaction", "recordInvoiceInteraction")).toBe(false);
  });
});
