import { dealRepository, userRepository, watchRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { Deal, ContractType } from "@/domain/models/deal";

export type UpdateDealResult = { ok: true; deal: Deal } | { ok: false; reason: string };

export async function updateDeal(data: {
  dealId: string;
  organizationId: string;
  actorId: string;
  title?: string;
  description?: string | null;
  estimatedAmount?: number | null;
  estimatedStartDate?: Date | null;
  estimatedEndDate?: Date | null;
  contractType?: ContractType | null;
  assigneeId?: string | null;
  technicalLeadId?: string | null;
  notes?: string | null;
}): Promise<UpdateDealResult> {
  const deal = await dealRepository.findById(data.dealId, data.organizationId);
  if (!deal) {
    return { ok: false, reason: "案件が見つかりません" };
  }

  // assigneeId / technicalLeadId が同一組織のユーザーであることを検証する
  if (data.assigneeId) {
    const assignee = await userRepository.findById(data.assigneeId, data.organizationId);
    if (!assignee) {
      return { ok: false, reason: "指定された担当者はこの組織に存在しません" };
    }
  }
  if (data.technicalLeadId) {
    const technicalLead = await userRepository.findById(data.technicalLeadId, data.organizationId);
    if (!technicalLead) {
      return { ok: false, reason: "指定された技術担当者はこの組織に存在しません" };
    }
  }

  try {
    const updatedDeal = await db.transaction(async (tx) => {
      const updated = await dealRepository.update(
        data.dealId,
        data.organizationId,
        {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.estimatedAmount !== undefined && { estimatedAmount: data.estimatedAmount }),
          ...(data.estimatedStartDate !== undefined && {
            estimatedStartDate: data.estimatedStartDate,
          }),
          ...(data.estimatedEndDate !== undefined && { estimatedEndDate: data.estimatedEndDate }),
          ...(data.contractType !== undefined && { contractType: data.contractType }),
          ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
          ...(data.technicalLeadId !== undefined && { technicalLeadId: data.technicalLeadId }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
        tx
      );

      // 変更されたフィールドのみ metadata に記録する
      const changedFields = Object.keys({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.estimatedAmount !== undefined && { estimatedAmount: data.estimatedAmount }),
        ...(data.estimatedStartDate !== undefined && { estimatedStartDate: data.estimatedStartDate }),
        ...(data.estimatedEndDate !== undefined && { estimatedEndDate: data.estimatedEndDate }),
        ...(data.contractType !== undefined && { contractType: data.contractType }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.technicalLeadId !== undefined && { technicalLeadId: data.technicalLeadId }),
        ...(data.notes !== undefined && { notes: data.notes }),
      });

      await recordAudit(
        {
          action: "deal.update",
          targetType: "deal",
          targetId: data.dealId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { updatedFields: changedFields },
        },
        tx
      );

      if (data.assigneeId) {
        await watchRepository.create(
          {
            userId: data.assigneeId,
            dealId: data.dealId,
            organizationId: data.organizationId,
          },
          tx
        );
      }

      return updated;
    });

    if (!updatedDeal) {
      return { ok: false, reason: "案件の更新に失敗しました" };
    }
    return { ok: true, deal: updatedDeal };
  } catch (err) {
    // 例外詳細（DB エラー文等）はクライアントに返さず、サーバー側にのみ記録する
    console.error("updateDeal failed", err);
    return { ok: false, reason: "案件の更新に失敗しました" };
  }
}
