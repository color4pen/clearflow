import type { InvoiceStatus } from "../models/invoice";

// 有効な遷移先の定義。paid と overdue は終端状態
const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  scheduled: ["invoiced"],
  invoiced: ["paid", "overdue"],
  paid: [],
  overdue: [],
};

/**
 * 請求ステータス遷移の妥当性を検証する。
 * 終端状態（paid / overdue）からの遷移、および定義外の遷移は不可。
 */
export function validateInvoiceTransition(
  from: InvoiceStatus,
  to: InvoiceStatus
): { ok: true } | { ok: false; reason: string } {
  const allowed = VALID_INVOICE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `${from} から ${to} への遷移は許可されていません`,
    };
  }
  return { ok: true };
}
