import { clientRepository, inquiryRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Inquiry } from "@/domain/models/inquiry";

export type CreateInquiryResult =
  | { ok: true; inquiry: Inquiry }
  | { ok: false; reason: string };

export async function createInquiry(data: {
  organizationId: string;
  actorId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  source: string;
  budget?: number | null;
  timeline?: string | null;
  assigneeId?: string | null;
}): Promise<CreateInquiryResult> {
  // 顧客が指定された場合のみ存在確認
  if (data.clientId) {
    const client = await clientRepository.findById(data.clientId, data.organizationId);
    if (!client) {
      return { ok: false, reason: "顧客が見つかりません" };
    }
  }

  try {
    const inquiry = await db.transaction(async (tx) => {
      const newInquiry = await inquiryRepository.create(
        {
          organizationId: data.organizationId,
          clientId: data.clientId ?? null,
          title: data.title,
          description: data.description,
          source: data.source,
          budget: data.budget ?? null,
          timeline: data.timeline ?? null,
          assigneeId: data.assigneeId,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "inquiry.create",
          targetType: "inquiry",
          targetId: newInquiry.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newInquiry;
    });

    return { ok: true, inquiry };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "引き合いの作成に失敗しました",
    };
  }
}
