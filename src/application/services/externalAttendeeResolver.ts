import { clientRepository } from "@/infrastructure/repositories";
import type { MeetingAttendee } from "@/domain/models/interaction";

export type ResolveExternalAttendeesResult =
  | { ok: true; attendees: MeetingAttendee[] }
  | { ok: false; reason: string };

/**
 * 社外参加者の顧客担当者 ID を顧客担当者マスタで解決し、
 * 氏名スナップショット付きの MeetingAttendee に変換する。
 *
 * - clientId が無い（顧客未設定の）関連先には社外参加者を追加できない。
 * - マスタに存在する ID は登録済みの氏名で解決する。
 * - マスタに存在しない ID でも existingExternal に同じ contactId のエントリが
 *   ある場合は、そのエントリ（記録時点の氏名スナップショット）を温存する
 *   （担当者が削除された後も既存記録を書き換えないため）。
 * - どちらにも存在しない ID はエラー。
 */
export async function resolveExternalAttendees(params: {
  contactIds: string[];
  clientId: string | null;
  organizationId: string;
  existingExternal?: MeetingAttendee[];
}): Promise<ResolveExternalAttendeesResult> {
  const { contactIds, clientId, organizationId, existingExternal = [] } = params;

  if (contactIds.length === 0) {
    return { ok: true, attendees: [] };
  }

  if (!clientId) {
    return { ok: false, reason: "社外参加者を追加するには顧客の設定が必要です" };
  }

  const contacts = await clientRepository.findContactsByClientId(clientId, organizationId);
  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

  const attendees: MeetingAttendee[] = [];
  const unresolvedIds: string[] = [];
  for (const contactId of contactIds) {
    const name = contactMap.get(contactId);
    if (name !== undefined) {
      attendees.push({ userId: null, contactId, name, isExternal: true });
      continue;
    }
    const existing = existingExternal.find((a) => a.contactId === contactId);
    if (existing) {
      attendees.push(existing);
      continue;
    }
    unresolvedIds.push(contactId);
  }

  if (unresolvedIds.length > 0) {
    return {
      ok: false,
      reason: `未登録の担当者IDが含まれています: ${unresolvedIds.join(", ")}`,
    };
  }

  return { ok: true, attendees };
}
