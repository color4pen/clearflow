/**
 * conditionEvaluator ドメインサービスの単体テスト。
 * pure function のため DB なしで実行可能。
 */

import { describe, it, expect } from "bun:test";
import { evaluateCondition } from "@/domain/services/conditionEvaluator";

// ---------------------------------------------------------------------------
// eq 演算子
// ---------------------------------------------------------------------------

describe("evaluateCondition: eq", () => {
  it("数値が一致する場合は true を返す", () => {
    expect(evaluateCondition("amount", "eq", "1000", { amount: 1000 })).toBe(true);
  });

  it("数値が不一致の場合は false を返す", () => {
    expect(evaluateCondition("amount", "eq", "1000", { amount: 999 })).toBe(false);
  });

  it("文字列が一致する場合は true を返す", () => {
    expect(evaluateCondition("source", "eq", "web", { source: "web" })).toBe(true);
  });

  it("文字列が不一致の場合は false を返す", () => {
    expect(evaluateCondition("source", "eq", "web", { source: "phone" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// neq 演算子
// ---------------------------------------------------------------------------

describe("evaluateCondition: neq", () => {
  it("文字列が異なる場合は true を返す", () => {
    expect(evaluateCondition("source", "neq", "phone", { source: "web" })).toBe(true);
  });

  it("文字列が同じ場合は false を返す", () => {
    expect(evaluateCondition("source", "neq", "web", { source: "web" })).toBe(false);
  });

  it("数値が異なる場合は true を返す", () => {
    expect(evaluateCondition("budget", "neq", "1000", { budget: 2000 })).toBe(true);
  });

  it("数値が同じ場合は false を返す", () => {
    expect(evaluateCondition("budget", "neq", "1000", { budget: 1000 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// gt 演算子
// ---------------------------------------------------------------------------

describe("evaluateCondition: gt", () => {
  it("数値が超過する場合は true を返す", () => {
    expect(evaluateCondition("budget", "gt", "1000000", { budget: 5000000 })).toBe(true);
  });

  it("数値が等しい場合は false を返す", () => {
    expect(evaluateCondition("budget", "gt", "1000000", { budget: 1000000 })).toBe(false);
  });

  it("数値が未満の場合は false を返す", () => {
    expect(evaluateCondition("budget", "gt", "1000000", { budget: 500000 })).toBe(false);
  });

  it("数値でない場合は false を返す", () => {
    expect(evaluateCondition("source", "gt", "web", { source: "phone" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// gte 演算子
// ---------------------------------------------------------------------------

describe("evaluateCondition: gte", () => {
  it("数値が超過する場合は true を返す", () => {
    expect(evaluateCondition("budget", "gte", "1000000", { budget: 2000000 })).toBe(true);
  });

  it("数値が等しい場合は true を返す", () => {
    expect(evaluateCondition("budget", "gte", "1000000", { budget: 1000000 })).toBe(true);
  });

  it("数値が未満の場合は false を返す", () => {
    expect(evaluateCondition("budget", "gte", "1000000", { budget: 500000 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lt 演算子
// ---------------------------------------------------------------------------

describe("evaluateCondition: lt", () => {
  it("数値が未満の場合は true を返す", () => {
    expect(evaluateCondition("budget", "lt", "1000000", { budget: 500000 })).toBe(true);
  });

  it("数値が等しい場合は false を返す", () => {
    expect(evaluateCondition("budget", "lt", "1000000", { budget: 1000000 })).toBe(false);
  });

  it("数値が超過する場合は false を返す", () => {
    expect(evaluateCondition("budget", "lt", "1000000", { budget: 2000000 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lte 演算子
// ---------------------------------------------------------------------------

describe("evaluateCondition: lte", () => {
  it("数値が未満の場合は true を返す", () => {
    expect(evaluateCondition("budget", "lte", "1000000", { budget: 500000 })).toBe(true);
  });

  it("数値が等しい場合は true を返す", () => {
    expect(evaluateCondition("budget", "lte", "1000000", { budget: 1000000 })).toBe(true);
  });

  it("数値が超過する場合は false を返す", () => {
    expect(evaluateCondition("budget", "lte", "1000000", { budget: 2000000 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// in 演算子
// ---------------------------------------------------------------------------

describe("evaluateCondition: in", () => {
  it("カンマ区切りリストに含まれる場合は true を返す", () => {
    expect(evaluateCondition("source", "in", "web,phone,email", { source: "web" })).toBe(true);
  });

  it("カンマ区切りリストに含まれない場合は false を返す", () => {
    expect(evaluateCondition("source", "in", "web,phone,email", { source: "referral" })).toBe(false);
  });

  it("空文字列はリストに含まれない", () => {
    expect(evaluateCondition("source", "in", "web,phone,email", { source: "" })).toBe(false);
  });

  it("数値もリストに含まれるか判定できる", () => {
    expect(evaluateCondition("budget", "in", "1000,2000,3000", { budget: 2000 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// エッジケース
// ---------------------------------------------------------------------------

describe("evaluateCondition: edge cases", () => {
  it("context にフィールドが存在しない場合は false を返す", () => {
    expect(evaluateCondition("budget", "gt", "1000000", {})).toBe(false);
  });

  it("context のフィールドが null の場合は false を返す", () => {
    expect(evaluateCondition("budget", "gt", "1000000", { budget: null })).toBe(false);
  });

  it("context のフィールドが undefined の場合は false を返す", () => {
    expect(evaluateCondition("budget", "eq", "0", { budget: undefined })).toBe(false);
  });
});
