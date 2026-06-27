import { dealContactRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { DealContact, DealContactRole } from "@/domain/models/deal";

export type AddDealContactResult =
  | { ok: true; dealContact: DealContact }
  | { ok: false; reason: string };

export async function addDealContact(data: {
  dealId: string;
  contactId: string;
  role: DealContactRole;
  organizationId: string;
  actorId: string;
}): Promise<AddDealContactResult> {
  try {
    const dealContact = await db.transaction(async (tx) => {
      const newDealContact = await dealContactRepository.create(
        {
          dealId: data.dealId,
          contactId: data.contactId,
          role: data.role,
          organizationId: data.organizationId,
        },
        tx
      );

      await recordAudit(
        {
          action: "deal_contact.create",
          targetType: "deal_contact",
          targetId: newDealContact.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newDealContact;
    });

    return { ok: true, dealContact };
  } catch (err) {
    // unique 制約違反は重複登録として扱う
    if (
      err instanceof Error &&
      (err.message.includes("unique") || err.message.includes("duplicate"))
    ) {
      return { ok: false, reason: "この担当者はすでに登録されています" };
    }
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "担当者の追加に失敗しました",
    };
  }
}
