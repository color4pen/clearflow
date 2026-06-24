import { revenueTargetRepository } from "@/infrastructure/repositories";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

export type UpdateRevenueTargetResult =
  | { ok: true; target: RevenueTarget }
  | { ok: false; reason: string };

export async function updateRevenueTarget(data: {
  id: string;
  organizationId: string;
  periodStart?: Date;
  periodEnd?: Date;
  targetAmount?: number;
}): Promise<UpdateRevenueTargetResult> {
  const { id, organizationId, periodStart, periodEnd, targetAmount } = data;

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

  const updated = await revenueTargetRepository.update(id, organizationId, {
    periodStart,
    periodEnd,
    targetAmount,
  });

  if (!updated) {
    return { ok: false, reason: "売上目標の更新に失敗しました" };
  }

  return { ok: true, target: updated };
}
