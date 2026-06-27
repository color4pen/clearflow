import * as meetingRepository from "@/infrastructure/repositories/meetingRepository";
import * as contractRepository from "@/infrastructure/repositories/contractRepository";
import * as actionItemRepository from "@/infrastructure/repositories/actionItemRepository";
import * as dealContactRepository from "@/infrastructure/repositories/dealContactRepository";
import * as auditLogRepository from "@/infrastructure/repositories/auditLogRepository";
import { ACTIVITY_TIMELINE_LIMIT, getHiddenActions } from "@/lib/activityConfig";
import type { AuditLog } from "@/domain/models/auditLog";

export async function getDealActivity(params: {
  dealId: string;
  organizationId: string;
}): Promise<AuditLog[]> {
  const { dealId, organizationId } = params;

  const [meetings, contracts, actionItems, dealContacts] = await Promise.all([
    meetingRepository.findAllByDeal(dealId, organizationId),
    contractRepository.findAllByDealId(dealId, organizationId),
    actionItemRepository.findByDeal(dealId, organizationId),
    dealContactRepository.findByDeal(dealId, organizationId),
  ]);

  const targets: Array<{ targetType: string; targetId: string }> = [
    { targetType: "deal", targetId: dealId },
    ...meetings.map((m) => ({ targetType: "meeting", targetId: m.id })),
    ...contracts.map((c) => ({ targetType: "contract", targetId: c.id })),
    ...actionItems.map((ai) => ({ targetType: "action_item", targetId: ai.id })),
    ...dealContacts.map((dc) => ({ targetType: "deal_contact", targetId: dc.id })),
  ];

  const excludeActions = getHiddenActions();

  return auditLogRepository.findByTargets(organizationId, targets, {
    limit: ACTIVITY_TIMELINE_LIMIT,
    ...(excludeActions.length > 0 ? { excludeActions } : {}),
  });
}
