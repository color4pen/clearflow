import { interactionRepository, dealRepository, inquiryRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type {
  Interaction,
  InteractionKind,
  MeetingType,
  HearingData,
  LegacyMeetingActionItem,
  MeetingAttendee,
} from "@/domain/models/interaction";

export type CreateMeetingResult =
  | { ok: true; meeting: Interaction }
  | { ok: false; reason: string };

export async function createMeeting(data: {
  organizationId: string;
  actorId: string;
  kind: InteractionKind;
  dealId?: string | null;
  inquiryId?: string | null;
  meetingType?: MeetingType | null;
  date: Date;
  location?: string | null;
  attendees: MeetingAttendee[];
  summary?: string | null;
  preparation?: string | null;
  actionItems: LegacyMeetingActionItem[];
  details?: HearingData | null;
}): Promise<CreateMeetingResult> {
  // dealId または inquiryId のいずれかが必須
  if (!data.dealId && !data.inquiryId) {
    return { ok: false, reason: "案件または引合のいずれかの指定が必要です" };
  }

  // 案件の存在確認（dealId 指定時）
  if (data.dealId) {
    const deal = await dealRepository.findById(data.dealId, data.organizationId);
    if (!deal) {
      return { ok: false, reason: "案件が見つかりません" };
    }
  }

  // 引合の存在確認（inquiryId 指定時）
  if (data.inquiryId) {
    const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
    if (!inquiry) {
      return { ok: false, reason: "引合が見つかりません" };
    }
  }

  // hearing 以外の meetingType では details を null に強制する
  const details = data.meetingType === "hearing" ? (data.details ?? null) : null;

  try {
    const meeting = await db.transaction(async (tx) => {
      const newMeeting = await interactionRepository.create(
        {
          organizationId: data.organizationId,
          kind: data.kind,
          dealId: data.dealId ?? null,
          inquiryId: data.inquiryId ?? null,
          meetingType: data.meetingType ?? null,
          date: data.date,
          location: data.location,
          attendees: data.attendees,
          summary: data.summary,
          preparation: data.preparation,
          actionItems: data.actionItems,
          details,
          createdById: data.actorId,
        },
        tx
      );

      await recordAudit(
        {
          action: "interaction.create",
          targetType: "interaction",
          targetId: newMeeting.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { kind: data.kind },
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
