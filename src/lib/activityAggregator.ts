import type { AuditLog, AuditAction, AuditTargetType } from "@/domain/models/auditLog";
import { TRANSITION_ACTIONS } from "@/lib/activityConfig";

export type TimelineEntry = {
  id: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  actorId: string;
  createdAt: Date;
  count: number;
  transition: { from: string; to: string } | null;
};

/**
 * metadata から状態遷移の from/to を正規化して取得する。
 * deal.updatePhase は fromPhase/toPhase、それ以外は fromStatus/toStatus。
 * metadata がない、または必要なキーがない場合は null を返す。
 */
function getTransitionFromMetadata(
  action: AuditAction,
  metadata: Record<string, unknown> | null
): { from: string; to: string } | null {
  if (!metadata) return null;

  if (action === "deal.updatePhase") {
    const from = metadata.fromPhase;
    const to = metadata.toPhase;
    if (typeof from === "string" && typeof to === "string") {
      return { from, to };
    }
  } else if (action === "contract.updateStatus" || action === "invoice.update_status") {
    const from = metadata.fromStatus;
    const to = metadata.toStatus;
    if (typeof from === "string" && typeof to === "string") {
      return { from, to };
    }
  }

  return null;
}

/**
 * 新しい順にソートされた AuditLog[] をタイムライン表示用に集約する。
 *
 * - 連続する同一 (actorId, action, targetId) を 1 件に集約し count を設定する。
 * - 状態遷移系アクションが連続する場合、最古エントリの from と最新エントリの to を
 *   transition に設定して正味遷移を表現する。
 * - 外部依存を持たない純粋関数。
 */
export function aggregateTimeline(logs: AuditLog[]): TimelineEntry[] {
  const result: TimelineEntry[] = [];

  for (const log of logs) {
    const last = result[result.length - 1];

    const isConsecutive =
      last !== undefined &&
      last.actorId === log.actorId &&
      last.action === log.action &&
      last.targetId === log.targetId;

    if (isConsecutive && last !== undefined) {
      last.count += 1;

      // 状態遷移系の連続集約: 最古エントリ（現在のlog）の from を採用する
      const isTransition = (TRANSITION_ACTIONS as string[]).includes(log.action);
      if (isTransition) {
        const t = getTransitionFromMetadata(log.action, log.metadata);
        if (t !== null && last.transition !== null) {
          // 最新エントリの to を維持しつつ、最古エントリの from に更新する
          last.transition = { from: t.from, to: last.transition.to };
        } else if (t !== null && last.transition === null) {
          // 最新エントリに metadata がなかった場合（既存ログ）で、古いエントリに metadata がある場合
          last.transition = t;
        }
        // t が null の場合: 古いログに metadata がないため何もしない
      }
    } else {
      const isTransition = (TRANSITION_ACTIONS as string[]).includes(log.action);
      const transition = isTransition
        ? getTransitionFromMetadata(log.action, log.metadata)
        : null;

      result.push({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        actorId: log.actorId,
        createdAt: log.createdAt,
        count: 1,
        transition,
      });
    }
  }

  return result;
}
