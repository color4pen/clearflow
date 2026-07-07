import { revenueTargetRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

export type UpdateRevenueTargetResult =
  | { ok: true; target: RevenueTarget }
  | { ok: false; reason: string };

export async function updateRevenueTarget(data: {
  id: string;
  organizationId: string;
  actorId: string;
  periodStart?: Date;
  periodEnd?: Date;
  targetAmount?: number;
}): Promise<UpdateRevenueTargetResult> {
  const { id, organizationId, actorId, periodStart, periodEnd, targetAmount } = data;

  const existing = await revenueTargetRepository.findById(id, organizationId);
  if (!existing) {
    return { ok: false, reason: "売上目標が見つかりません" };
  }

  if (targetAmount !== undefined && targetAmount <= 0) {
    return { ok: false, reason: "目標金額は1以上の値を入力してください" };
  }

  // 期間が変更される場合は重複チェック
  if (periodStart !== undefined || periodEnd !== undefined) {
    const newStart = periodStart ?? existing.periodStart;
    const newEnd = periodEnd ?? existing.periodEnd;

    if (newStart >= newEnd) {
      return { ok: false, reason: "期間の終了日は開始日より後の日付を指定してください" };
    }

    const overlapping = await revenueTargetRepository.findOverlapping(
      organizationId,
      newStart,
      newEnd,
      id
    );

    if (overlapping.length > 0) {
      return { ok: false, reason: "指定した期間には既に目標が設定されています" };
    }
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const result = await revenueTargetRepository.update(
        id,
        organizationId,
        { periodStart, periodEnd, targetAmount },
        existing.version,
        tx
      );

      if (!result) {
        return null;
      }

      await recordAudit(
        {
          action: "revenue_target.update",
          targetType: "revenue_target",
          targetId: id,
          actorId,
          organizationId,
          metadata: {
            before: {
              periodStart: existing.periodStart.toISOString(),
              periodEnd: existing.periodEnd.toISOString(),
              targetAmount: existing.targetAmount,
            },
            after: {
              periodStart: (periodStart ?? existing.periodStart).toISOString(),
              periodEnd: (periodEnd ?? existing.periodEnd).toISOString(),
              targetAmount: targetAmount ?? existing.targetAmount,
            },
          },
        },
        tx
      );

      return result;
    });

    if (!updated) {
      return { ok: false, reason: "この売上目標は他のユーザーによって更新されました。画面を更新してください" };
    }

    return { ok: true, target: updated };
  } catch {
    return {
      ok: false,
      reason: "売上目標の更新に失敗しました",
    };
  }
}
