import type { ConditionOperator } from "@/domain/models/approvalPolicy";

/**
 * Evaluates a single condition against a context object.
 *
 * - Returns false if context[field] is undefined or null.
 * - Uses numeric comparison when both sides are finite numbers; falls back to
 *   string comparison for eq/neq; returns false for gt/gte/lt/lte.
 * - "in" operator splits value by comma and checks whether String(context[field])
 *   is contained in the resulting list.
 */
export function evaluateCondition(
  field: string,
  operator: ConditionOperator,
  value: string,
  context: Record<string, unknown>
): boolean {
  const contextValue = context[field];
  if (contextValue === undefined || contextValue === null) {
    return false;
  }

  if (operator === "in") {
    const list = value.split(",").map((v) => v.trim());
    return list.includes(String(contextValue));
  }

  const contextNum = Number(contextValue);
  const valueNum = Number(value);
  const bothNumeric = isFinite(contextNum) && isFinite(valueNum);

  switch (operator) {
    case "eq":
      return bothNumeric ? contextNum === valueNum : String(contextValue) === value;
    case "neq":
      return bothNumeric ? contextNum !== valueNum : String(contextValue) !== value;
    case "gt":
      return bothNumeric ? contextNum > valueNum : false;
    case "gte":
      return bothNumeric ? contextNum >= valueNum : false;
    case "lt":
      return bothNumeric ? contextNum < valueNum : false;
    case "lte":
      return bothNumeric ? contextNum <= valueNum : false;
    default:
      return false;
  }
}
