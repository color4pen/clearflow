import { describe, it, expect } from "bun:test";
import { getActionLabel, getTargetTypeLabel } from "@/lib/activityLabels";

describe("getActionLabel", () => {
  it('getActionLabel("deal.create") が "案件を作成" を返す', () => {
    expect(getActionLabel("deal.create")).toBe("案件を作成");
  });

  it('getActionLabel("unknown.action") がそのまま "unknown.action" を返す（フォールバック）', () => {
    expect(getActionLabel("unknown.action")).toBe("unknown.action");
  });
});

describe("getTargetTypeLabel", () => {
  it('getTargetTypeLabel("deal") が "案件" を返す', () => {
    expect(getTargetTypeLabel("deal")).toBe("案件");
  });

  it('getTargetTypeLabel("unknown") がそのまま "unknown" を返す（フォールバック）', () => {
    expect(getTargetTypeLabel("unknown")).toBe("unknown");
  });
});
