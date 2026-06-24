import { clientRepository, auditLogRepository } from "@/infrastructure/repositories";
import { validateIsPrimaryUniqueness } from "@/domain/services/clientContactValidation";
import type { ClientContact } from "@/domain/models/client";

export type UpdateClientContactResult =
  | { ok: true; contact: ClientContact }
  | { ok: false; reason: string };

export async function updateClientContact(data: {
  contactId: string;
  clientId: string;
  organizationId: string;
  actorId: string;
  name: string;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}): Promise<UpdateClientContactResult> {
  try {
    // テナント検証: clientId が organizationId に属するかを確認する
    const client = await clientRepository.findById(data.clientId, data.organizationId);
    if (!client) {
      return { ok: false, reason: "顧客が見つかりません" };
    }

    // isPrimary の重複チェック（自身を除外する）
    const existingContacts = await clientRepository.findContactsByClientId(data.clientId);
    const validation = validateIsPrimaryUniqueness(
      data.isPrimary ?? false,
      existingContacts,
      data.contactId
    );
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    const updated = await clientRepository.updateContact(data.contactId, data.clientId, {
      name: data.name,
      department: data.department ?? null,
      position: data.position ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      isPrimary: data.isPrimary ?? false,
    });

    if (!updated) {
      return { ok: false, reason: "担当者が見つかりません" };
    }

    await auditLogRepository.create({
      action: "client_contact.update",
      targetType: "client_contact",
      targetId: data.contactId,
      actorId: data.actorId,
      organizationId: data.organizationId,
    });

    return { ok: true, contact: updated };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "担当者の更新に失敗しました",
    };
  }
}
