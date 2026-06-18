/**
 * statusUtils unit tests
 *
 * TC-008: statusClass 関数の各ステータスに対する戻り値を検証する
 * TC-011: statusRowClass 関数の各ステータスに対する戻り値を検証する
 * TC-012: stepStatusLabel / stepStatusClass がエクスポートされており正しく動作する
 */

import { describe, it, expect } from "bun:test";
import {
  statusClass,
  statusRowClass,
  stepStatusLabel,
  stepStatusClass,
} from "@/app/(dashboard)/requests/statusUtils";

// ---------------------------------------------------------------------------
// TC-008: statusClass — 各ステータスの色クラスが正しくマッピングされている
// ---------------------------------------------------------------------------

describe("statusUtils — statusClass", () => {
  /**
   * TC-008: 各ステータスの色クラスが正しくマッピングされている
   */
  it("TC-008: draft returns text-[#2980b9]", () => {
    expect(statusClass("draft")).toBe("text-[#2980b9]");
  });

  it("TC-008: pending returns text-[#d4880f] font-bold", () => {
    expect(statusClass("pending")).toBe("text-[#d4880f] font-bold");
  });

  it("TC-008: approved returns text-[#1a8a4a]", () => {
    expect(statusClass("approved")).toBe("text-[#1a8a4a]");
  });

  it("TC-008: rejected returns text-[#c0392b]", () => {
    expect(statusClass("rejected")).toBe("text-[#c0392b]");
  });

  it("TC-008: revision returns text-[#d35400] font-bold", () => {
    expect(statusClass("revision")).toBe("text-[#d35400] font-bold");
  });

  it("TC-008: expired returns text-[#999999]", () => {
    expect(statusClass("expired")).toBe("text-[#999999]");
  });
});

// ---------------------------------------------------------------------------
// TC-011: statusRowClass — 行背景色が正しくマッピングされている
// ---------------------------------------------------------------------------

describe("statusUtils — statusRowClass", () => {
  /**
   * TC-011: statusRowClass が正しいクラスを返す
   */
  it("TC-011: pending returns bg-amber-50", () => {
    expect(statusRowClass("pending")).toBe("bg-amber-50");
  });

  it("TC-011: revision returns bg-orange-50", () => {
    expect(statusRowClass("revision")).toBe("bg-orange-50");
  });

  it("TC-011: approved returns empty string", () => {
    expect(statusRowClass("approved")).toBe("");
  });

  it("TC-011: draft returns empty string", () => {
    expect(statusRowClass("draft")).toBe("");
  });

  it("TC-011: rejected returns empty string", () => {
    expect(statusRowClass("rejected")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// TC-012: stepStatusLabel / stepStatusClass がエクスポートされている
// ---------------------------------------------------------------------------

describe("statusUtils — stepStatusLabel and stepStatusClass", () => {
  /**
   * TC-012: stepStatusLabel / stepStatusClass がエクスポートされており
   *         ApprovalStepStatus を引数として受け付ける
   */
  it("TC-012: stepStatusLabel is exported and returns correct Japanese labels", () => {
    expect(typeof stepStatusLabel).toBe("function");
    expect(stepStatusLabel("pending")).toBe("審査中");
    expect(stepStatusLabel("approved")).toBe("承認済み");
    expect(stepStatusLabel("rejected")).toBe("差し戻し");
  });

  it("TC-012: stepStatusClass is exported and returns correct CSS classes", () => {
    expect(typeof stepStatusClass).toBe("function");
    expect(stepStatusClass("pending")).toBe("text-amber-700 font-medium");
    expect(stepStatusClass("approved")).toBe("text-emerald-700 font-medium");
    expect(stepStatusClass("rejected")).toBe("text-orange-600 font-medium");
  });
});
