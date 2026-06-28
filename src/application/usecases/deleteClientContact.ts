import { clientRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";


export type DeleteClientContactResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deleteClientContact(data: {
  contactId: string;
  clientId: string;
  organizationId: string;
  actorId: string;
}): Promise<DeleteClientContactResult> {
  try {
    // テナント検証: clientId が organizationId に属するかを確認する
    const client = await clientRepository.findById(data.clientId, data.organizationId);
    if (!client) {
      return { ok: false, reason: "顧客が見つかりません" };
    }

    const deleted = await clientRepository.deleteContact(data.contactId, data.clientId, data.organizationId);
    if (!deleted) {
      return { ok: false, reason: "担当者が見つかりません" };
    }

    await recordAudit({
      action: "client_contact.delete",
      targetType: "client_contact",
      targetId: data.contactId,
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
