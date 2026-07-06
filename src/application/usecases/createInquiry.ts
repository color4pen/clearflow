import { clientRepository, inquiryRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

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
  contactNote?: string | null;
  source: string;
  assigneeId?: string | null;
  budget?: number | null;
  timeline?: string | null;
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
          contactNote: data.contactNote,
          source: data.source,
          assigneeId: data.assigneeId,
          budget: data.budget ?? null,
          timeline: data.timeline ?? null,
        },
        tx
      );

      await recordAudit(
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
    // 例外詳細（DB エラー文等）はクライアントに返さず、サーバー側にのみ記録する
    console.error("createInquiry failed", err);
    return { ok: false, reason: "引き合いの作成に失敗しました" };
  }
}
