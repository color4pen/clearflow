export const TRIGGER_ACTION_LABELS: Record<string, string> = {
  "inquiry.convert": "引合の案件化",
  "contract.create": "契約の作成",
  "contract.cancel": "契約の解除",
};

export const TRIGGER_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "inquiry.convert", label: "引合の案件化" },
  { value: "contract.create", label: "契約の作成" },
  { value: "contract.cancel", label: "契約の解除" },
];

export const CONDITION_OPERATOR_LABELS: Record<string, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  neq: "≠",
  in: "含む",
};

export const CONDITION_OPERATOR_OPTIONS: { value: string; label: string }[] = [
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "in", label: "含む" },
];

export function getTriggerActionLabel(action: string): string {
  return TRIGGER_ACTION_LABELS[action] ?? action;
}

export function formatCondition(
  field: string | null,
  operator: string | null,
  value: string | null
): string {
  if (field === null) return "常に";
  const operatorLabel =
    operator !== null ? (CONDITION_OPERATOR_LABELS[operator] ?? operator) : "";
  return `${field} ${operatorLabel} ${value ?? ""}`.trim();
}
