import type { ContractStatus } from "../models/contract";

// 終端状態: これらのステータスからの遷移は禁止する
const TERMINAL_STATUSES: ContractStatus[] = ["completed", "cancelled"];

/**
 * 契約ステータス遷移が許可されているかを返す。
 * active → completed / cancelled のみ許可。
 * completed / cancelled は終端状態。同一ステータスへの遷移も拒否する。
 */
export function canTransition(from: ContractStatus, to: ContractStatus): boolean {
  if (TERMINAL_STATUSES.includes(from)) {
    return false;
  }
  if (from === to) {
    return false;
  }
  return true;
}
