import type { ApprovalTemplate } from "../models/approvalTemplate";

/**
 * Selects the most appropriate approval template for the given amount.
 *
 * Selection rules:
 * - If amount is null: returns the default template (minAmount === null && maxAmount === null).
 * - If amount is specified: returns the first template (from specific to generic) where
 *   (minAmount === null || minAmount <= amount) && (maxAmount === null || maxAmount >= amount).
 *   Templates with at least one bound set are checked before the default template (both null).
 * - Returns null if no matching template is found.
 *
 * This is a pure function with no side effects.
 */
export function selectTemplate(
  templates: ApprovalTemplate[],
  amount: number | null
): ApprovalTemplate | null {
  if (amount === null) {
    return (
      templates.find(
        (t) => t.minAmount === null && t.maxAmount === null
      ) ?? null
    );
  }

  // Sort: specific templates (at least one bound set) before default (both null)
  const sorted = [...templates].sort((a, b) => {
    const aIsDefault = a.minAmount === null && a.maxAmount === null;
    const bIsDefault = b.minAmount === null && b.maxAmount === null;
    if (aIsDefault && !bIsDefault) return 1;
    if (!aIsDefault && bIsDefault) return -1;
    return 0;
  });

  return (
    sorted.find(
      (t) =>
        (t.minAmount === null || t.minAmount <= amount) &&
        (t.maxAmount === null || t.maxAmount >= amount)
    ) ?? null
  );
}
