import { clientRepository, auditLogRepository } from "@/infrastructure/repositories";
import { validatePrimaryUniqueness } from "@/domain/services/clientContactService";
import type { ClientContact } from "@/domain/models/client";

export type CreateClientContactResult =
  | { ok: true; contact: ClientContact }
  | { ok: false; reason: string };

export async function createClientContact(data: {
  clientId: string;
  name: string;
  organizationId: string;
  actorId: string;
  isPrimary?: boolean;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<CreateClientContactResult> {
  try {
    // テナント検証: clientId が organizationId に属するかを確認する
    const client = await clientRepository.findById(data.clientId, data.organizationId);
    if (!client) {
      return { ok: false, reason: "顧客が見つかりません" };
    }

    // isPrimary=true の場合は既存の主担当者との重複チェックを行う
    if (data.isPrimary) {
      const existingContacts = await clientRepository.findContactsByClientId(data.clientId);
      const existingPrimaryCount = existingContacts.filter((c) => c.isPrimary).length;
      const validation = validatePrimaryUniqueness(data.isPrimary, existingPrimaryCount);
      if (!validation.valid) {
        return { ok: false, reason: validation.reason };
      }
    }

    const contact = await clientRepository.createContact({
      clientId: data.clientId,
      name: data.name,
      isPrimary: data.isPrimary ?? false,
      department: data.department,
      position: data.position,
      email: data.email,
      phone: data.phone,
    });

    await auditLogRepository.create({
      action: "client_contact.create",
      targetType: "client_contact",
      targetId: contact.id,
      actorId: data.actorId,
      organizationId: data.organizationId,
    });

    return { ok: true, contact };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "担当者の作成に失敗しました",
    };
  }
}
