import {
  dealRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import { canDealTransition } from "@/domain/services";
import { dispatcher } from "@/domain/events";
import type { Deal, DealPhase } from "@/domain/models/deal";

export type UpdateDealPhaseResult = { ok: true; deal: Deal } | { ok: false; reason: string };

export async function updateDealPhase(data: {
  dealId: string;
  organizationId: string;
  actorId: string;
  newPhase: DealPhase;
}): Promise<UpdateDealPhaseResult> {
  return dispatcher.runInContext(async () => {
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
          deal.version,
          tx
        );

        await recordAudit(
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

        if (data.newPhase === "won") {
          await dispatcher.dispatch({
            type: "deal.won",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              dealId: data.dealId,
              fromPhase: deal.phase,
            },
          });
        } else if (data.newPhase === "lost") {
          await dispatcher.dispatch({
            type: "deal.lost",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              dealId: data.dealId,
              fromPhase: deal.phase,
            },
          });
        } else {
          await dispatcher.dispatch({
            type: "deal.phase_changed",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              dealId: data.dealId,
              fromPhase: deal.phase,
              toPhase: data.newPhase,
            },
          });
        }

        return updated;
      });

      if (!updatedDeal) {
        return { ok: false, reason: "この案件は他のユーザーによって更新されました" };
      }

      dispatcher.flushAsync();
      return { ok: true, deal: updatedDeal };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "フェーズ更新に失敗しました",
      };
    }
  });
}
