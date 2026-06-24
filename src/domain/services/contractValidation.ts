export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * 契約金額が正の整数であることを検証する。
 * amount > 0 でなければエラーを返す。
 */
export function validateContractAmount(amount: number): ValidationResult {
  if (amount <= 0) {
    return { ok: false, reason: "契約金額は1以上の値を入力してください" };
  }
  return { ok: true };
}

/**
 * 契約の開始日が終了日以前であることを検証する。
 * endDate が null の場合はスキップする。
 */
export function validateContractDates(startDate: Date, endDate: Date | null): ValidationResult {
  if (endDate !== null && startDate > endDate) {
    return { ok: false, reason: "開始日は終了日以前の日付を入力してください" };
  }
  return { ok: true };
}
