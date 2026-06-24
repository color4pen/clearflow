import { revenueTargetRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";

export type DeleteRevenueTargetResult = { ok: true } | { ok: false; reason: string };

export async function deleteRevenueTarget(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<DeleteRevenueTargetResult> {
  const { id, organizationId, actorId } = data;

  const existing = await revenueTargetRepository.findById(id, organizationId);
  if (!existing) {
    return { ok: false, reason: "売上目標が見つかりません" };
  }

  try {
    await db.transaction(async (tx) => {
      await revenueTargetRepository.deleteById(id, organizationId, tx);

      await auditLogRepository.create(
        {
          action: "revenue_target.delete",
          targetType: "revenue_target",
          targetId: id,
          actorId,
          organizationId,
          metadata: {
            periodStart: existing.periodStart.toISOString(),
            periodEnd: existing.periodEnd.toISOString(),
            targetAmount: existing.targetAmount,
          },
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "売上目標の削除に失敗しました",
    };
  }
}
