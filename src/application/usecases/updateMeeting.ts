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
  attendees?: MeetingAttendee[];
  summary?: string | null;
  actionItems?: LegacyMeetingActionItem[];
  details?: HearingData | null;
}): Promise<UpdateMeetingResult> {
  // 商談の存在確認
  const existing = await interactionRepository.findById(data.meetingId, data.organizationId);
  if (!existing) {
    return { ok: false, reason: "商談が見つかりません" };
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
          ...(data.attendees !== undefined && { attendees: data.attendees }),
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
