import { describe, it, expect } from "bun:test";
import { selectTemplate } from "@/domain/services/templateSelectionService";
import type { ApprovalTemplate } from "@/domain/models/approvalTemplate";

function makeTemplate(
  overrides: Partial<ApprovalTemplate> & { id: string; name: string }
): ApprovalTemplate {
  return {
    id: overrides.id,
    name: overrides.name,
    organizationId: "org-1",
    steps: overrides.steps ?? [{ stepOrder: 1, approverRole: "manager" }],
    minAmount: overrides.minAmount !== undefined ? overrides.minAmount : null,
    maxAmount: overrides.maxAmount !== undefined ? overrides.maxAmount : null,
    createdAt: new Date("2024-01-01"),
  };
}

const defaultTemplate = makeTemplate({
  id: "tmpl-default",
  name: "デフォルト（上長承認）",
  minAmount: null,
  maxAmount: null,
});

const smallTemplate = makeTemplate({
  id: "tmpl-small",
  name: "少額申請（上長承認）",
  minAmount: null,
  maxAmount: 100000,
});

const largeTemplate = makeTemplate({
  id: "tmpl-large",
  name: "高額申請（上長→経理承認）",
  steps: [
    { stepOrder: 1, approverRole: "manager" },
    { stepOrder: 2, approverRole: "finance" },
  ],
  minAmount: 100001,
  maxAmount: null,
});

const allTemplates = [defaultTemplate, smallTemplate, largeTemplate];

describe("selectTemplate — amount is null (default template)", () => {
  it("returns the default template when amount is null", () => {
    const result = selectTemplate(allTemplates, null);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("tmpl-default");
  });

  it("returns null when no default template exists and amount is null", () => {
    const result = selectTemplate([smallTemplate, largeTemplate], null);
    expect(result).toBeNull();
  });

  it("returns the default template even if it is the only one", () => {
    const result = selectTemplate([defaultTemplate], null);
    expect(result?.id).toBe("tmpl-default");
  });
});

describe("selectTemplate — amount 100000 (small amount boundary)", () => {
  it("returns the small template for amount=100000", () => {
    const result = selectTemplate(allTemplates, 100000);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("tmpl-small");
  });

  it("returns the small template when default and small are available for amount=100000", () => {
    const result = selectTemplate([defaultTemplate, smallTemplate], 100000);
    expect(result?.id).toBe("tmpl-small");
  });
});

describe("selectTemplate — amount 200000 (large amount)", () => {
  it("returns the large template for amount=200000", () => {
    const result = selectTemplate(allTemplates, 200000);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("tmpl-large");
  });
});

describe("selectTemplate — amount 100001 (large amount boundary)", () => {
  it("returns the large template for amount=100001", () => {
    const result = selectTemplate(allTemplates, 100001);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("tmpl-large");
  });
});

describe("selectTemplate — amount 0 (zero amount)", () => {
  it("returns the small template for amount=0 (satisfies maxAmount=100000)", () => {
    const result = selectTemplate(allTemplates, 0);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("tmpl-small");
  });
});

describe("selectTemplate — no matching template", () => {
  it("returns null when no template matches the amount", () => {
    // Only a specific template with minAmount=50000, maxAmount=80000
    const specificTemplate = makeTemplate({
      id: "tmpl-specific",
      name: "特定範囲",
      minAmount: 50000,
      maxAmount: 80000,
    });
    const result = selectTemplate([specificTemplate], 100000);
    expect(result).toBeNull();
  });

  it("returns null for an empty templates array", () => {
    const result = selectTemplate([], 100000);
    expect(result).toBeNull();
  });
});

describe("selectTemplate — specific template preferred over default", () => {
  it("returns specific template over default when both match amount=100000", () => {
    // Both default (null,null) and small (null,100000) match amount=100000
    const result = selectTemplate([defaultTemplate, smallTemplate], 100000);
    expect(result?.id).toBe("tmpl-small");
  });

  it("falls back to default when no specific template matches", () => {
    // amount=50 only matches small (null,100000) but not large (100001,null)
    // Both default and small match; specific (small) wins
    const result = selectTemplate([defaultTemplate, smallTemplate], 50);
    expect(result?.id).toBe("tmpl-small");
  });

  it("returns default template when amount matches only default", () => {
    // Large only accepts >=100001; amount=200000 matches large
    // With only default + large, amount=50000 matches neither large (min=100001) but matches default
    const result = selectTemplate([defaultTemplate, largeTemplate], 50000);
    expect(result?.id).toBe("tmpl-default");
  });
});
