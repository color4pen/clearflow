import { dealContactRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";

export type RemoveDealContactResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function removeDealContact(data: {
  dealId: string;
  contactId: string;
  organizationId: string;
  actorId: string;
}): Promise<RemoveDealContactResult> {
  try {
    await db.transaction(async (tx) => {
      await dealContactRepository.deleteByDealAndContact(
        data.dealId,
        data.contactId,
        data.organizationId,
        tx
      );

      await auditLogRepository.create(
        {
          action: "deal_contact.delete",
          targetType: "deal_contact",
          targetId: `${data.dealId}:${data.contactId}`,
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
      reason: err instanceof Error ? err.message : "担当者の削除に失敗しました",
    };
  }
}
