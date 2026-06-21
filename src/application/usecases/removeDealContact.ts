import { dealContactRepository, auditLogRepository } from "@/infrastructure/repositories";

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
    await dealContactRepository.deleteByDealAndContact(
      data.dealId,
      data.contactId,
      data.organizationId
    );

    await auditLogRepository.create({
      action: "deal_contact.delete",
      targetType: "deal_contact",
      targetId: `${data.dealId}:${data.contactId}`,
      actorId: data.actorId,
      organizationId: data.organizationId,
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "担当者の削除に失敗しました",
    };
  }
}
