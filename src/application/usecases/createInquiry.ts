import { clientRepository, inquiryRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Inquiry } from "@/domain/models/inquiry";

export type CreateInquiryResult =
  | { ok: true; inquiry: Inquiry }
  | { ok: false; reason: string };

export async function createInquiry(data: {
  organizationId: string;
  actorId: string;
  clientId: string;
  contactId?: string | null;
  title: string;
  description?: string | null;
  source: string;
  assigneeId?: string | null;
}): Promise<CreateInquiryResult> {
  // 顧客の存在確認
  const client = await clientRepository.findById(data.clientId, data.organizationId);
  if (!client) {
    return { ok: false, reason: "顧客が見つかりません" };
  }

  try {
    const inquiry = await db.transaction(async (tx) => {
      const newInquiry = await inquiryRepository.create(
        {
          organizationId: data.organizationId,
          clientId: data.clientId,
          contactId: data.contactId,
          title: data.title,
          description: data.description,
          source: data.source,
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
