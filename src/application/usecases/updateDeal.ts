import { dealRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Deal, ContractType } from "@/domain/models/deal";

export type UpdateDealResult = { ok: true; deal: Deal } | { ok: false; reason: string };

export async function updateDeal(data: {
  dealId: string;
  organizationId: string;
  actorId: string;
  title?: string;
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

  try {
    const updatedDeal = await db.transaction(async (tx) => {
      const updated = await dealRepository.update(
        data.dealId,
        data.organizationId,
        {
          ...(data.title !== undefined && { title: data.title }),
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

      await auditLogRepository.create(
        {
          action: "deal.update",
          targetType: "deal",
          targetId: data.dealId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return updated;
    });

    if (!updatedDeal) {
      return { ok: false, reason: "案件の更新に失敗しました" };
    }
    return { ok: true, deal: updatedDeal };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "案件の更新に失敗しました",
    };
  }
}
