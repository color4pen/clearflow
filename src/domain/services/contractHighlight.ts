import type { ContractWithClient } from "@/domain/models/contract";

/**
 * 終了日が今日から 30 日以内の active 契約かどうかを判定する。
 * 終了日が過去（期限超過）の active 契約も対象に含む。
 */
export function isExpiringWithin30Days(
  row: Pick<ContractWithClient, "endDate" | "status">
): boolean {
  if (!row.endDate || row.status !== "active") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  return row.endDate <= thirtyDaysLater;
}
