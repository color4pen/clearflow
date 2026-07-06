import { clientRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";
import type { ClientContact } from "@/domain/models/client";

export type UpdateClientContactInput = Partial<{
  name: string;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}>;

export type UpdateClientContactResult =
  | { ok: true; contact: ClientContact }
  | { ok: false; reason: string };

export async function updateClientContact(data: {
  organizationId: string;
  clientId: string;
  contactId: string;
  data: UpdateClientContactInput;
  userId: string;
}): Promise<UpdateClientContactResult> {
  try {
    const updatedContact = await db.transaction(async (tx) => {
      const updated = await clientRepository.updateContact(
        data.contactId,
        data.clientId,
        data.organizationId,
        data.data,
        tx
      );

      if (!updated) {
        return null;
      }

      await recordAudit(
        {
          action: "client_contact.update",
          targetType: "client_contact",
          targetId: data.contactId,
          actorId: data.userId,
          organizationId: data.organizationId,
        },
        tx
      );

      return updated;
    });

    if (!updatedContact) {
      return { ok: false, reason: "担当者が見つかりません" };
    }

    return { ok: true, contact: updatedContact };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "担当者の更新に失敗しました",
    };
  }
}
