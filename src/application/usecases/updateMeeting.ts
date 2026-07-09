import { interactionRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

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
  | { ok: false; reason: string };

export async function updateMeeting(data: {
  meetingId: string;
  organizationId: string;
  actorId: string;
  meetingType?: MeetingType;
  date?: Date;
  location?: string | null;
  /** 後方互換用: Server Action から attendees を全置換する場合に使う。internalAttendees / externalAttendees と同時指定時は後者を優先する。 */
  attendees?: MeetingAttendee[];
  /** 社内参加者のみ差し替える場合に使う。省略時は既存の社内参加者を保持する。null を指定すると社内参加者をクリアする。 */
  internalAttendees?: MeetingAttendee[];
  /** 社外参加者のみ差し替える場合に使う。省略時は既存の社外参加者を保持する。null を指定すると社外参加者をクリアする。 */
  externalAttendees?: MeetingAttendee[];
  summary?: string | null;
  preparation?: string | null;
  actionItems?: LegacyMeetingActionItem[];
  details?: HearingData | null;
}): Promise<UpdateMeetingResult> {
  // 商談の存在確認
  const existing = await interactionRepository.findById(data.meetingId, data.organizationId);
  if (!existing) {
    return { ok: false, reason: "商談が見つかりません" };
  }

  // attendees の解決: internalAttendees / externalAttendees が優先される（MCP 部分更新）
  // どちらか一方でも指定された場合、指定側を差し替え、未指定側は既存を保持する
  // 両方とも未指定の場合は attendees（後方互換 / Server Action）を使う
  let resolvedAttendees: MeetingAttendee[] | undefined;
  if (data.internalAttendees !== undefined || data.externalAttendees !== undefined) {
    const existingInternal = existing.attendees.filter((a) => !a.isExternal);
    const existingExternal = existing.attendees.filter((a) => a.isExternal);
    const newInternal = data.internalAttendees !== undefined ? data.internalAttendees : existingInternal;
    const newExternal = data.externalAttendees !== undefined ? data.externalAttendees : existingExternal;
    resolvedAttendees = [...newInternal, ...newExternal];
  } else {
    resolvedAttendees = data.attendees;
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
          ...(data.preparation !== undefined && { preparation: data.preparation }),
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
