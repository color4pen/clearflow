import type { DealPhase } from "../models/deal";

// 終端状態（won, lost）はマップに含めない
const VALID_TRANSITIONS: Partial<Record<DealPhase, DealPhase[]>> = {
  proposal_prep: ["proposed", "lost"],
  proposed: ["negotiation", "lost"],
  negotiation: ["won", "lost"],
};

/**
 * 案件のフェーズ遷移が許可されているかを返す。
 * 終端状態（won, lost）からの遷移は常に false。
 */
export function canTransition(from: DealPhase, to: DealPhase): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
