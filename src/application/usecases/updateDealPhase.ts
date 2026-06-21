import {
  dealRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { canDealTransition } from "@/domain/services";
import type { Deal, DealPhase } from "@/domain/models/deal";

export type UpdateDealPhaseResult = { ok: true; deal: Deal } | { ok: false; reason: string };

export async function updateDealPhase(data: {
  dealId: string;
  organizationId: string;
  actorId: string;
  newPhase: DealPhase;
}): Promise<UpdateDealPhaseResult> {
  const deal = await dealRepository.findById(data.dealId, data.organizationId);
  if (!deal) {
    return { ok: false, reason: "案件が見つかりません" };
  }

  if (!canDealTransition(deal.phase, data.newPhase)) {
    return {
      ok: false,
      reason: `フェーズを "${deal.phase}" から "${data.newPhase}" に変更することはできません`,
    };
  }

  try {
    const updatedDeal = await db.transaction(async (tx) => {
      const updated = await dealRepository.updatePhase(
        data.dealId,
        data.organizationId,
        data.newPhase,
        null,
        deal.version,
        tx
      );

      await auditLogRepository.create(
        {
          action: "deal.updatePhase",
          targetType: "deal",
          targetId: data.dealId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: {
            fromPhase: deal.phase,
            toPhase: data.newPhase,
          },
        },
        tx
      );

      return updated;
    });

    if (!updatedDeal) {
      return { ok: false, reason: "この案件は他のユーザーによって更新されました" };
    }
    return { ok: true, deal: updatedDeal };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "フェーズ更新に失敗しました",
    };
  }
}
