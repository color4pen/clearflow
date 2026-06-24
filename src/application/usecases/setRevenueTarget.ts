import { revenueTargetRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

export type SetRevenueTargetResult =
  | { ok: true; target: RevenueTarget }
  | { ok: false; reason: string };

export async function setRevenueTarget(data: {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  targetAmount: number;
  actorId: string;
}): Promise<SetRevenueTargetResult> {
  const { organizationId, periodStart, periodEnd, targetAmount, actorId } = data;

  if (targetAmount <= 0) {
    return { ok: false, reason: "目標金額は1以上の値を入力してください" };
  }

  if (periodStart >= periodEnd) {
    return { ok: false, reason: "期間の終了日は開始日より後の日付を指定してください" };
  }

  const overlapping = await revenueTargetRepository.findOverlapping(
    organizationId,
    periodStart,
    periodEnd
  );

  if (overlapping.length > 0) {
    return { ok: false, reason: "指定した期間には既に目標が設定されています" };
  }

  try {
    const target = await db.transaction(async (tx) => {
      const created = await revenueTargetRepository.create(
        { organizationId, periodStart, periodEnd, targetAmount },
        tx
      );

      await auditLogRepository.create(
        {
          action: "revenue_target.create",
          targetType: "revenue_target",
          targetId: created.id,
          actorId,
          organizationId,
          metadata: {
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            targetAmount,
          },
        },
        tx
      );

      return created;
    });

    return { ok: true, target };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "売上目標の作成に失敗しました",
    };
  }
}
