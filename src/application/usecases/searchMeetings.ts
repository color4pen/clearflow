import { interactionRepository, dealRepository, inquiryRepository } from "@/infrastructure/repositories";
import { formatDateJP } from "@/lib/dateUtils";
import { meetingTypeLabels } from "@/lib/meetingLabels";
import type { LinkTargetResult } from "./searchDeals";

export async function searchMeetings(
  organizationId: string,
  query: string
): Promise<LinkTargetResult[]> {
  const meetings = await interactionRepository.searchBySummary(organizationId, query);

  const results: LinkTargetResult[] = [];

  for (const meeting of meetings) {
    const typeLabel = meeting.meetingType ? meetingTypeLabels[meeting.meetingType] : "";
    const primary = `${formatDateJP(meeting.date)} ${typeLabel}`.trim();
    let secondary: string | null = null;
    // 商談画面は案件配下にのみ存在する（引合直下の商談はリンク先なし）
    const href = meeting.dealId
      ? `/deals/${meeting.dealId}/meetings/${meeting.id}`
      : null;

    if (meeting.dealId) {
      const deal = await dealRepository.findById(meeting.dealId, organizationId);
      if (deal) secondary = deal.title;
    } else if (meeting.inquiryId) {
      const inquiry = await inquiryRepository.findById(meeting.inquiryId, organizationId);
      if (inquiry) secondary = inquiry.title;
    }

    results.push({ id: meeting.id, primary, secondary, href });
  }

  return results;
}
