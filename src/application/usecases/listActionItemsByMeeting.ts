import { meetingRepository, actionItemRepository } from "@/infrastructure/repositories";
import type { ActionItem } from "@/domain/models/actionItem";

export type ListActionItemsByMeetingResult =
  | { ok: true; actionItems: ActionItem[] }
  | { ok: false; reason: string };

export async function listActionItemsByMeeting(data: {
  meetingId: string;
  organizationId: string;
}): Promise<ListActionItemsByMeetingResult> {
  const meeting = await meetingRepository.findById(data.meetingId, data.organizationId);
  if (!meeting) {
    return { ok: false, reason: "商談が見つかりません" };
  }

  const actionItems = await actionItemRepository.findByMeeting(data.meetingId, data.organizationId);
  return { ok: true, actionItems };
}
