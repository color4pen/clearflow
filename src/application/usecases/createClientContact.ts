import { clientRepository, auditLogRepository } from "@/infrastructure/repositories";
import { validateIsPrimaryUniqueness } from "@/domain/services/clientContactValidation";
import { db } from "@/infrastructure/db";
import type { ClientContact } from "@/domain/models/client";

export type CreateClientContactResult =
  | { ok: true; contact: ClientContact }
  | { ok: false; reason: string };

export async function createClientContact(data: {
  clientId: string;
  name: string;
  organizationId: string;
  actorId: string;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}): Promise<CreateClientContactResult> {
  try {
    // テナント検証: clientId が organizationId に属するかを確認する
    const client = await clientRepository.findById(data.clientId, data.organizationId);
    if (!client) {
      return { ok: false, reason: "顧客が見つかりません" };
    }

    // isPrimary の重複チェック
    if (data.isPrimary) {
      const existingContacts = await clientRepository.findContactsByClientId(data.clientId);
      const validation = validateIsPrimaryUniqueness(data.isPrimary, existingContacts);
      if (!validation.ok) {
        return { ok: false, reason: validation.reason };
      }
    }

    const contact = await db.transaction(async (tx) => {
      const created = await clientRepository.createContact({
        clientId: data.clientId,
        name: data.name,
        department: data.department,
        position: data.position,
        email: data.email,
        phone: data.phone,
        isPrimary: data.isPrimary ?? false,
      }, tx);

      await auditLogRepository.create({
        action: "client_contact.create",
        targetType: "client_contact",
        targetId: created.id,
        actorId: data.actorId,
        organizationId: data.organizationId,
      }, tx);

      return created;
    });

    return { ok: true, contact };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "担当者の作成に失敗しました",
    };
  }
}
