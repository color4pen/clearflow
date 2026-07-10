import { interactionRepository, dealRepository, inquiryRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { resolveExternalAttendees } from "@/application/services/externalAttendeeResolver";

import { db } from "@/infrastructure/db";
import type {
  Interaction,
  MeetingType,
  HearingData,
  LegacyMeetingActionItem,
  MeetingAttendee,
} from "@/domain/models/interaction";

export type UpdateMeetingResult =
  | { ok: true; meeting: Interaction }
  | { ok: false; reason: string; field?: "externalContactIds" };

export async function updateMeeting(data: {
  meetingId: string;
  organizationId: string;
  actorId: string;
  meetingType?: MeetingType;
  date?: Date;
  location?: string | null;
  /** 社内参加者のみ差し替える。省略時は既存の社内参加者を保持する。contactId: null / isExternal: false は usecase 側で強制する。 */
  internalAttendees?: MeetingAttendee[];
  /**
   * 社外参加者の顧客担当者 ID。
   * - undefined（省略）: 既存の社外参加者（氏名スナップショット）を保持する
   * - null または空配列: 社外参加者をクリアする
   * - 配列: 関連先（案件/引合）の顧客の登録済み担当者から解決して差し替える。
   *   マスタから削除済みの ID でも既存の社外参加者に含まれていればそのエントリを温存する
   */
  externalContactIds?: string[] | null;
  summary?: string | null;
  actionItems?: LegacyMeetingActionItem[];
  details?: HearingData | null;
}): Promise<UpdateMeetingResult> {
  // 商談の存在確認
  const existing = await interactionRepository.findById(data.meetingId, data.organizationId);
  if (!existing) {
    return { ok: false, reason: "商談が見つかりません" };
  }

  const existingInternal = existing.attendees.filter((a) => !a.isExternal);
  const existingExternal = existing.attendees.filter((a) => a.isExternal);

  // attendees の解決: internal / external を独立して部分更新する。
  // 指定側を差し替え、未指定側は既存を保持する。両方未指定なら attendees は更新しない。
  let resolvedAttendees: MeetingAttendee[] | undefined;
  if (data.internalAttendees !== undefined || data.externalContactIds !== undefined) {
    const newInternal =
      data.internalAttendees !== undefined
        ? data.internalAttendees.map((a) => ({
            userId: a.userId ?? null,
            contactId: null,
            name: a.name,
            isExternal: false,
          }))
        : existingInternal;

    let newExternal: MeetingAttendee[];
    if (data.externalContactIds === undefined) {
      newExternal = existingExternal;
    } else if (data.externalContactIds === null || data.externalContactIds.length === 0) {
      newExternal = [];
    } else {
      // 既存 interaction の関連先から顧客 ID を導出する
      let clientId: string | null = null;
      if (existing.dealId) {
        const deal = await dealRepository.findById(existing.dealId, data.organizationId);
        if (deal) clientId = deal.clientId;
      } else if (existing.inquiryId) {
        const inquiry = await inquiryRepository.findById(existing.inquiryId, data.organizationId);
        if (inquiry) clientId = inquiry.clientId;
      }

      const resolved = await resolveExternalAttendees({
        contactIds: data.externalContactIds,
        clientId,
        organizationId: data.organizationId,
        existingExternal,
      });
      if (!resolved.ok) {
        return { ok: false, reason: resolved.reason, field: "externalContactIds" };
      }
      newExternal = resolved.attendees;
    }

    resolvedAttendees = [...newInternal, ...newExternal];
  }

  // 更新後の meetingType（指定がなければ既存の meetingType）が hearing でない場合は details を null に強制する
  const effectiveMeetingType = data.meetingType ?? existing.meetingType;
  const details =
    effectiveMeetingType === "hearing"
      ? data.details !== undefined
        ? data.details
        : existing.details
      : null;

  try {
    const result = await db.transaction(async (tx) => {
      const updated = await interactionRepository.update(
        data.meetingId,
        data.organizationId,
        {
          ...(data.meetingType !== undefined && { meetingType: data.meetingType }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.location !== undefined && { location: data.location }),
          ...(resolvedAttendees !== undefined && { attendees: resolvedAttendees }),
          ...(data.summary !== undefined && { summary: data.summary }),
          ...(data.actionItems !== undefined && { actionItems: data.actionItems }),
          details,
        },
        existing.version,
        tx
      );

      if (!updated) {
        return null;
      }

      await recordAudit(
        {
          action: "interaction.update",
          targetType: "interaction",
          targetId: data.meetingId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { kind: existing.kind },
        },
        tx
      );

      return updated;
    });

    if (!result) {
      return { ok: false, reason: "この商談は他のユーザーによって更新されました。画面を更新してください" };
    }
    return { ok: true, meeting: result };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "商談の更新に失敗しました",
    };
  }
}
