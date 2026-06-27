import { meetingRepository, dealRepository, inquiryRepository } from "@/infrastructure/repositories";
import { formatDateJP } from "@/lib/dateUtils";
import { meetingTypeLabels } from "@/lib/meetingLabels";

export async function searchMeetings(
  organizationId: string,
  query: string
): Promise<{ id: string; label: string }[]> {
  const meetings = await meetingRepository.searchBySummary(organizationId, query);

  const results: { id: string; label: string }[] = [];

  for (const meeting of meetings) {
    const dateStr = formatDateJP(meeting.date);
    const typeLabel = meetingTypeLabels[meeting.type];
    let label = `${dateStr} ${typeLabel}`;

    if (meeting.dealId) {
      const deal = await dealRepository.findById(meeting.dealId, organizationId);
      if (deal) {
        label += `（${deal.title}）`;
      }
    } else if (meeting.inquiryId) {
      const inquiry = await inquiryRepository.findById(meeting.inquiryId, organizationId);
      if (inquiry) {
        label += `（${inquiry.title}）`;
      }
    }

    results.push({ id: meeting.id, label });
  }

  return results;
}
