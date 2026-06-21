import type { DealPhase } from "../models/deal";

// 終端状態: これらのフェーズからの遷移は禁止する
const TERMINAL_PHASES: DealPhase[] = ["won", "lost"];

const ALL_PHASES: DealPhase[] = ["proposal_prep", "proposed", "negotiation", "won", "lost"];

/**
 * 案件のフェーズ遷移が許可されているかを返す。
 * 終端状態（won, lost）からの遷移は常に false。
 * from / to が有効な DealPhase でない場合（廃止フェーズ等）は false。
 * それ以外は有効な DealPhase への遷移であれば許可（巻き戻し・スキップを含む）。
 */
export function canTransition(from: DealPhase, to: DealPhase): boolean {
  // 廃止・無効なフェーズからの遷移は拒否する
  if (!ALL_PHASES.includes(from)) {
    return false;
  }
  if (TERMINAL_PHASES.includes(from)) {
    return false;
  }
  if (!ALL_PHASES.includes(to)) {
    return false;
  }
  if (from === to) {
    return false;
  }
  return true;
}
