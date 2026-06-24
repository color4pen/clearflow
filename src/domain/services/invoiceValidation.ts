export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * 請求予定日が支払期限以前であることを検証する。
 * issueDate が null の場合はスキップする。
 */
export function validateInvoiceDates(issueDate: Date | null, dueDate: Date): ValidationResult {
  if (issueDate !== null && issueDate > dueDate) {
    return { ok: false, reason: "請求予定日は支払期限以前の日付を入力してください" };
  }
  return { ok: true };
}
