import { requestRepository, meetingRepository, inquiryRepository } from "@/infrastructure/repositories";
import { listDeals } from "./listDeals";
import type { DashboardActionItem } from "@/domain/models/dashboard";

export async function getDashboardActions(
  organizationId: string,
  userRole: string
): Promise<DashboardActionItem[]> {
  const [requestsWithSteps, meetings, inquiries, deals] = await Promise.all([
    requestRepository.findAllWithStepsByOrganization(organizationId),
    meetingRepository.findAllByOrganization(organizationId),
    inquiryRepository.findAllWithClientByOrganization(organizationId),
    listDeals(organizationId),
  ]);

  // Build dealId → dealTitle map
  const dealTitleMap = new Map<string, string>(
    deals.map((d) => [d.id, d.title])
  );

  const items: DashboardActionItem[] = [];

  // (a) Approval requests: pending request with a step matching userRole
  for (const req of requestsWithSteps) {
    if (req.status !== "pending") continue;
    const matchingStep = req.approvalSteps.find(
      (step) => step.approverRole === userRole && step.status === "pending"
    );
    if (!matchingStep) continue;
    items.push({
      type: "approval",
      requestId: req.id,
      requestTitle: req.title,
      approverRole: matchingStep.approverRole,
      deadline: matchingStep.deadline,
    });
  }

  // (b) Action items: all meetings, all undone action items
  for (const meeting of meetings) {
    for (const actionItem of meeting.actionItems) {
      if (actionItem.done) continue;
      items.push({
        type: "action_item",
        dealId: meeting.dealId,
        dealTitle: dealTitleMap.get(meeting.dealId) ?? "",
        description: actionItem.description,
        assignee: actionItem.assignee,
        dueDate: actionItem.dueDate,
      });
    }
  }

  // (c) Inquiries with status === "new"
  for (const inquiry of inquiries) {
    if (inquiry.status !== "new") continue;
    items.push({
      type: "inquiry",
      inquiryId: inquiry.id,
      inquiryTitle: inquiry.title,
      createdAt: inquiry.createdAt,
    });
  }

  // Sort by deadline ascending, nulls last
  items.sort((a, b) => {
    const dateA = getSortDate(a);
    const dateB = getSortDate(b);
    if (dateA === null && dateB === null) return 0;
    if (dateA === null) return 1;
    if (dateB === null) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  return items;
}

function getSortDate(item: DashboardActionItem): Date | null {
  if (item.type === "approval") {
    return item.deadline;
  }
  if (item.type === "action_item") {
    return item.dueDate ? new Date(item.dueDate) : null;
  }
  // inquiry
  return item.createdAt;
}
