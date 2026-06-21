import {
  inquiryRepository,
  dealRepository,
  auditLogRepository,
  userRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Deal } from "@/domain/models/deal";
import type { ContractType } from "@/domain/models/deal";

export type CreateDealResult = { ok: true; deal: Deal } | { ok: false; reason: string };

export async function createDeal(data: {
  organizationId: string;
  actorId: string;
  inquiryId: string;
  title: string;
  estimatedAmount?: number | null;
  estimatedStartDate?: Date | null;
  estimatedEndDate?: Date | null;
  contractType?: ContractType | null;
  assigneeId?: string | null;
  technicalLeadId?: string | null;
  notes?: string | null;
}): Promise<CreateDealResult> {
  const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
  if (!inquiry) {
    return { ok: false, reason: "引き合いが見つかりません" };
  }

  if (inquiry.status !== "converted") {
    return { ok: false, reason: "案件化済みの引き合いにのみ案件を作成できます" };
  }

  const existing = await dealRepository.findByInquiryId(data.inquiryId, data.organizationId);
  if (existing) {
    return { ok: false, reason: "この引き合いにはすでに案件が存在します" };
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
    const deal = await db.transaction(async (tx) => {
      const newDeal = await dealRepository.create(
        {
          organizationId: data.organizationId,
          inquiryId: data.inquiryId,
          title: data.title,
          estimatedAmount: data.estimatedAmount ?? null,
          estimatedStartDate: data.estimatedStartDate ?? null,
          estimatedEndDate: data.estimatedEndDate ?? null,
          contractType: data.contractType ?? null,
          assigneeId: data.assigneeId ?? null,
          technicalLeadId: data.technicalLeadId ?? null,
          notes: data.notes ?? null,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "deal.create",
          targetType: "deal",
          targetId: newDeal.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newDeal;
    });

    return { ok: true, deal };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "案件の作成に失敗しました",
    };
  }
}
