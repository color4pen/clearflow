import { inquiryRepository, meetingRepository, dealRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Meeting, MeetingType, HearingData, ActionItem, MeetingAttendees } from "@/domain/models/meeting";

export type CreateMeetingResult =
  | { ok: true; meeting: Meeting }
  | { ok: false; reason: string };

export async function createMeeting(data: {
  organizationId: string;
  actorId: string;
  inquiryId?: string | null;
  dealId?: string | null;
  type: MeetingType;
  date: Date;
  location?: string | null;
  attendees: MeetingAttendees;
  summary?: string | null;
  actionItems: ActionItem[];
  hearingData?: HearingData | null;
}): Promise<CreateMeetingResult> {
  // inquiryId と dealId のどちらか一方は必須
  if (!data.inquiryId && !data.dealId) {
    return { ok: false, reason: "引き合いまたは案件のどちらかを指定してください" };
  }

  // 引き合いの存在確認（inquiryId が指定された場合のみ）
  if (data.inquiryId) {
    const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
    if (!inquiry) {
      return { ok: false, reason: "引き合いが見つかりません" };
    }
  }

  // 案件の存在確認（dealId が指定された場合のみ）
  if (data.dealId) {
    const deal = await dealRepository.findById(data.dealId, data.organizationId);
    if (!deal) {
      return { ok: false, reason: "案件が見つかりません" };
    }
  }

  // hearing 以外の type では hearingData を null に強制する
  const hearingData = data.type === "hearing" ? (data.hearingData ?? null) : null;

  try {
    const meeting = await db.transaction(async (tx) => {
      const newMeeting = await meetingRepository.create(
        {
          organizationId: data.organizationId,
          inquiryId: data.inquiryId ?? null,
          dealId: data.dealId ?? null,
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
