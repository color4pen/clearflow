import {
  inquiryRepository,
  dealRepository,
  userRepository,
  clientRepository,
  watchRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { Deal } from "@/domain/models/deal";
import type { ContractType } from "@/domain/models/deal";

export type CreateDealResult = { ok: true; deal: Deal } | { ok: false; reason: string };

export async function createDeal(data: {
  organizationId: string;
  actorId: string;
  inquiryId?: string;
  clientId?: string;
  title: string;
  description?: string | null;
  estimatedAmount?: number | null;
  estimatedStartDate?: Date | null;
  estimatedEndDate?: Date | null;
  contractType?: ContractType | null;
  assigneeId?: string | null;
  technicalLeadId?: string | null;
  notes?: string | null;
}): Promise<CreateDealResult> {
  let resolvedClientId: string;

  if (data.inquiryId) {
    // パターン (a): inquiryId 指定あり — 既存の引き合い存在確認 + converted チェック + 重複チェック
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

    if (!inquiry.clientId) {
      return { ok: false, reason: "案件化するには顧客の登録が必要です" };
    }

    resolvedClientId = inquiry.clientId;
  } else {
    // パターン (b): inquiryId 指定なし — clientId 必須
    if (!data.clientId) {
      return { ok: false, reason: "顧客の指定が必要です" };
    }

    const client = await clientRepository.findById(data.clientId, data.organizationId);
    if (!client) {
      return { ok: false, reason: "指定された顧客はこの組織に存在しません" };
    }

    resolvedClientId = data.clientId;
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
          clientId: resolvedClientId,
          inquiryId: data.inquiryId,
          title: data.title,
          description: data.description ?? null,
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

      await recordAudit(
        {
          action: "deal.create",
          targetType: "deal",
          targetId: newDeal.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      await watchRepository.create(
        {
          userId: data.actorId,
          dealId: newDeal.id,
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
