import { meetingRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Meeting, MeetingType, HearingData, ActionItem, MeetingAttendees } from "@/domain/models/meeting";

export type UpdateMeetingResult =
  | { ok: true; meeting: Meeting }
  | { ok: false; reason: string };

export async function updateMeeting(data: {
  meetingId: string;
  organizationId: string;
  actorId: string;
  type?: MeetingType;
  date?: Date;
  location?: string | null;
  attendees?: MeetingAttendees;
  summary?: string | null;
  actionItems?: ActionItem[];
  hearingData?: HearingData | null;
}): Promise<UpdateMeetingResult> {
  // 商談の存在確認
  const existing = await meetingRepository.findById(data.meetingId, data.organizationId);
  if (!existing) {
    return { ok: false, reason: "商談が見つかりません" };
  }

  // 更新後の type（指定がなければ既存の type）が hearing でない場合は hearingData を null に強制する
  const effectiveType = data.type ?? existing.type;
  const hearingData = effectiveType === "hearing" ? (data.hearingData !== undefined ? data.hearingData : existing.hearingData) : null;

  try {
    const result = await db.transaction(async (tx) => {
      const updated = await meetingRepository.update(
        data.meetingId,
        data.organizationId,
        {
          ...(data.type !== undefined && { type: data.type }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.attendees !== undefined && { attendees: data.attendees }),
          ...(data.summary !== undefined && { summary: data.summary }),
          ...(data.actionItems !== undefined && { actionItems: data.actionItems }),
          hearingData,
        },
        tx
      );

      if (!updated) {
        throw new Error("商談の更新に失敗しました");
      }

      await auditLogRepository.create(
        {
          action: "meeting.update",
          targetType: "meeting",
          targetId: data.meetingId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return updated;
    });

    return { ok: true, meeting: result };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "商談の更新に失敗しました",
    };
  }
}
