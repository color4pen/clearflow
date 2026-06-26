import {
  actionItemRepository,
  dealRepository,
  meetingRepository,
  inquiryRepository,
} from "@/infrastructure/repositories";
import type { ActionItem } from "@/domain/models/actionItem";

export type ActionItemWithSource = ActionItem & {
  sourceName: string;
  sourceHref: string | null;
};

function formatDateJP(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

export async function listActionItems(data: {
  organizationId: string;
  done?: boolean;
  assigneeId?: string;
}): Promise<ActionItemWithSource[]> {
  const items = await actionItemRepository.findByOrganization(data.organizationId, {
    done: data.done,
    assigneeId: data.assigneeId,
  });

  // Extract unique IDs for related entities
  const dealIds = [...new Set(items.map((i) => i.dealId).filter((id): id is string => id !== null))];
  const meetingIds = [...new Set(items.map((i) => i.meetingId).filter((id): id is string => id !== null))];
  const inquiryIds = [...new Set(items.map((i) => i.inquiryId).filter((id): id is string => id !== null))];

  // Fetch all related entities in parallel
  const [dealResults, meetingResults, inquiryResults] = await Promise.all([
    Promise.all(dealIds.map((id) => dealRepository.findById(id, data.organizationId))),
    Promise.all(meetingIds.map((id) => meetingRepository.findById(id, data.organizationId))),
    Promise.all(inquiryIds.map((id) => inquiryRepository.findById(id, data.organizationId))),
  ]);

  // Build lookup Maps
  const dealMap = new Map(
    dealResults
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map((d) => [d.id, d])
  );
  const meetingMap = new Map(
    meetingResults
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => [m.id, m])
  );
  const inquiryMap = new Map(
    inquiryResults
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .map((i) => [i.id, i])
  );

  return items.map((item) => {
    let sourceName: string;
    let sourceHref: string | null;

    if (item.dealId) {
      const deal = dealMap.get(item.dealId);
      sourceName = deal?.title ?? item.dealId;
      sourceHref = `/deals/${item.dealId}`;
    } else if (item.meetingId) {
      const meeting = meetingMap.get(item.meetingId);
      if (meeting) {
        sourceName = formatDateJP(meeting.date);
        sourceHref = meeting.dealId
          ? `/deals/${meeting.dealId}/meetings/${item.meetingId}`
          : null;
      } else {
        sourceName = item.meetingId;
        sourceHref = null;
      }
    } else if (item.inquiryId) {
      const inquiry = inquiryMap.get(item.inquiryId);
      sourceName = inquiry?.title ?? item.inquiryId;
      sourceHref = `/inquiries/${item.inquiryId}`;
    } else {
      sourceName = "個人タスク";
      sourceHref = null;
    }

    return {
      ...item,
      sourceName,
      sourceHref,
    };
  });
}
