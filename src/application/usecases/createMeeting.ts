import { meetingRepository, dealRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Meeting, MeetingType, HearingData, ActionItem, MeetingAttendees } from "@/domain/models/meeting";

export type CreateMeetingResult =
  | { ok: true; meeting: Meeting }
  | { ok: false; reason: string };

export async function createMeeting(data: {
  organizationId: string;
  actorId: string;
  dealId: string;
  type: MeetingType;
  date: Date;
  location?: string | null;
  attendees: MeetingAttendees;
  summary?: string | null;
  actionItems: ActionItem[];
  hearingData?: HearingData | null;
}): Promise<CreateMeetingResult> {
  // 案件の存在確認
  const deal = await dealRepository.findById(data.dealId, data.organizationId);
  if (!deal) {
    return { ok: false, reason: "案件が見つかりません" };
  }

  // hearing 以外の type では hearingData を null に強制する
  const hearingData = data.type === "hearing" ? (data.hearingData ?? null) : null;

  try {
    const meeting = await db.transaction(async (tx) => {
      const newMeeting = await meetingRepository.create(
        {
          organizationId: data.organizationId,
          dealId: data.dealId,
          type: data.type,
          date: data.date,
          location: data.location,
          attendees: data.attendees,
          summary: data.summary,
          actionItems: data.actionItems,
          hearingData,
          createdById: data.actorId,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "meeting.create",
          targetType: "meeting",
          targetId: newMeeting.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newMeeting;
    });

    return { ok: true, meeting };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "商談の作成に失敗しました",
    };
  }
}
