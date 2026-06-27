import { inquiryRepository, dealRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";

export type DeleteInquiryResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deleteInquiry(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<DeleteInquiryResult> {
  // 案件が紐づいていないかを確認する
  const existingDeal = await dealRepository.findByInquiryId(data.id, data.organizationId);
  if (existingDeal) {
    return { ok: false, reason: "案件が紐づいている引き合いは削除できません" };
  }

  try {
    await db.transaction(async (tx) => {
      await inquiryRepository.deleteById(data.id, data.organizationId, tx);

      await recordAudit(
        {
          action: "inquiry.delete",
          targetType: "inquiry",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "引き合いの削除に失敗しました",
    };
  }
}
