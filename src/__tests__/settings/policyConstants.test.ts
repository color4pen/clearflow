import { describe, it, expect } from "bun:test";
import {
  getTriggerActionLabel,
  formatCondition,
  TRIGGER_ACTION_LABELS,
  CONDITION_OPERATOR_LABELS,
} from "@/app/(dashboard)/settings/policies/constants";

describe("getTriggerActionLabel", () => {
  it("TC-038: inquiry.convert を「引合の案件化」に変換する", () => {
    expect(getTriggerActionLabel("inquiry.convert")).toBe("引合の案件化");
  });

  it("TC-038: contract.create を「契約の作成」に変換する", () => {
    expect(getTriggerActionLabel("contract.create")).toBe("契約の作成");
  });

  it("TC-038: contract.cancel を「契約の解除」に変換する", () => {
    expect(getTriggerActionLabel("contract.cancel")).toBe("契約の解除");
  });

  it("TC-039: 未定義の値はそのまま返す", () => {
    expect(getTriggerActionLabel("unknown.action")).toBe("unknown.action");
  });

  it("TC-039: 空文字はそのまま返す", () => {
    expect(getTriggerActionLabel("")).toBe("");
  });
});

describe("formatCondition", () => {
  it("TC-040: conditionField が null のとき「常に」を返す", () => {
    expect(formatCondition(null, null, null)).toBe("常に");
  });

  it("TC-041: amount ≥ 100000 の形式で整形する", () => {
    expect(formatCondition("amount", "gte", "100000")).toBe("amount ≥ 100000");
  });

  it("TC-041: gt 演算子は「>」ラベルで表示される", () => {
    expect(formatCondition("budget", "gt", "500000")).toBe("budget > 500000");
  });

  it("TC-041: eq 演算子は「=」ラベルで表示される", () => {
    expect(formatCondition("status", "eq", "active")).toBe("status = active");
  });
});

describe("TRIGGER_ACTION_LABELS", () => {
  it("3つのトリガーアクションが定義されている", () => {
    expect(Object.keys(TRIGGER_ACTION_LABELS)).toHaveLength(3);
  });
});

describe("CONDITION_OPERATOR_LABELS", () => {
  it("7つの演算子が定義されている (gt, gte, lt, lte, eq, neq, in)", () => {
    expect(Object.keys(CONDITION_OPERATOR_LABELS)).toHaveLength(7);
  });

  it("neq は「≠」ラベルである", () => {
    expect(CONDITION_OPERATOR_LABELS["neq"]).toBe("≠");
  });

  it("in は「含む」ラベルである", () => {
    expect(CONDITION_OPERATOR_LABELS["in"]).toBe("含む");
  });
});
