/**
 * statusUtils unit tests
 *
 * TC-008: statusVariant 関数の各ステータスに対する戻り値を検証する
 * TC-011: statusRowClass 関数の各ステータスに対する戻り値を検証する
 * TC-012: stepStatusLabel / stepStatusVariant がエクスポートされており正しく動作する
 */

import { describe, it, expect } from "bun:test";
import {
  statusVariant,
  statusRowClass,
  stepStatusLabel,
  stepStatusVariant,
} from "@/app/(dashboard)/requests/statusUtils";

// ---------------------------------------------------------------------------
// TC-008: statusVariant — 各ステータスの variant が正しくマッピングされている
// ---------------------------------------------------------------------------

describe("statusUtils — statusVariant", () => {
  /**
   * TC-008: 各ステータスの variant が正しくマッピングされている
   */
  it("TC-008: draft returns gray", () => {
    expect(statusVariant("draft")).toBe("gray");
  });

  it("TC-008: pending returns yellow", () => {
    expect(statusVariant("pending")).toBe("yellow");
  });

  it("TC-008: approved returns green", () => {
    expect(statusVariant("approved")).toBe("green");
  });

  it("TC-008: rejected returns red", () => {
    expect(statusVariant("rejected")).toBe("red");
  });

  it("TC-008: revision returns yellow", () => {
    expect(statusVariant("revision")).toBe("yellow");
  });

  it("TC-008: expired returns gray", () => {
    expect(statusVariant("expired")).toBe("gray");
  });
});

// ---------------------------------------------------------------------------
// TC-011: statusRowClass — 行背景色が正しくマッピングされている
// ---------------------------------------------------------------------------

describe("statusUtils — statusRowClass", () => {
  /**
   * TC-011: statusRowClass が正しいクラスを返す
   */
  it("TC-011: pending returns bg-bg-row-pending", () => {
    expect(statusRowClass("pending")).toBe("bg-bg-row-pending");
  });

  it("TC-011: revision returns bg-bg-row-revision", () => {
    expect(statusRowClass("revision")).toBe("bg-bg-row-revision");
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
// TC-012: stepStatusLabel / stepStatusVariant がエクスポートされている
// ---------------------------------------------------------------------------

describe("statusUtils — stepStatusLabel and stepStatusVariant", () => {
  /**
   * TC-012: stepStatusLabel / stepStatusVariant がエクスポートされており
   *         ApprovalStepStatus を引数として受け付ける
   */
  it("TC-012: stepStatusLabel is exported and returns correct Japanese labels", () => {
    expect(typeof stepStatusLabel).toBe("function");
    expect(stepStatusLabel("pending")).toBe("審査中");
    expect(stepStatusLabel("approved")).toBe("承認済み");
    expect(stepStatusLabel("rejected")).toBe("差し戻し");
  });

  it("TC-012: stepStatusVariant is exported and returns correct variant values", () => {
    expect(typeof stepStatusVariant).toBe("function");
    expect(stepStatusVariant("pending")).toBe("yellow");
    expect(stepStatusVariant("approved")).toBe("green");
    expect(stepStatusVariant("rejected")).toBe("yellow");
  });
});
