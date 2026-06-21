import {
  dealRepository,
  auditLogRepository,
  approvalTemplateRepository,
  requestRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { canDealTransition, filterStepsByCondition } from "@/domain/services";
import type { Deal, DealPhase } from "@/domain/models/deal";

export type UpdateDealPhaseResult = { ok: true; deal: Deal } | { ok: false; reason: string };

export async function updateDealPhase(data: {
  dealId: string;
  organizationId: string;
  actorId: string;
  newPhase: DealPhase;
  templateId?: string;
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

  // estimate_approval への遷移時は見積承認リクエストを自動作成する
  if (data.newPhase === "estimate_approval") {
    if (!data.templateId) {
      return { ok: false, reason: "見積承認フェーズへの遷移にはテンプレートの指定が必要です" };
    }

    const template = await approvalTemplateRepository.findById(
      data.templateId,
      data.organizationId
    );
    if (!template) {
      return { ok: false, reason: "テンプレートが見つかりません" };
    }

    const formData = {
      amount: { value: deal.estimatedAmount, label: "想定金額" },
    };

    const filteredSteps = filterStepsByCondition(template.steps, formData);

    try {
      const updatedDeal = await db.transaction(async (tx) => {
        const now = new Date();

        const newRequest = await requestRepository.create(
          {
            title: `見積承認: ${deal.title}`,
            formData,
            templateId: data.templateId,
            organizationId: data.organizationId,
            creatorId: data.actorId,
            status: "pending" as const,
            sourceType: "deal",
            sourceId: data.dealId,
          },
          tx
        );

        await approvalStepRepository.createMany(
          filteredSteps.map((s) => ({
            requestId: newRequest.id,
            stepOrder: s.stepOrder,
            approverRole: s.approverRole,
            organizationId: data.organizationId,
            deadline:
              s.deadlineHours != null
                ? new Date(now.getTime() + s.deadlineHours * 60 * 60 * 1000)
                : null,
          })),
          tx
        );

        const updated = await dealRepository.updatePhase(
          data.dealId,
          data.organizationId,
          data.newPhase,
          newRequest.id,
          deal.version,
          tx
        );

        // バージョン不一致時はトランザクションをロールバックして承認リクエストの孤立を防ぐ
        if (!updated) {
          throw new Error("この案件は他のユーザーによって更新されました");
        }

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
              requestId: newRequest.id,
            },
          },
          tx
        );

        await auditLogRepository.create(
          {
            action: "request.create",
            targetType: "request",
            targetId: newRequest.id,
            actorId: data.actorId,
            organizationId: data.organizationId,
            metadata: {
              templateId: template.id,
              templateName: template.name,
              dealId: data.dealId,
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

  // estimate_approval 以外の遷移
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
