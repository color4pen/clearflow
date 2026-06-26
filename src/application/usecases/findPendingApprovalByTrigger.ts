import { requestRepository } from "@/infrastructure/repositories";
import type { Request } from "@/domain/models/request";

export async function findPendingApprovalByTrigger(
  organizationId: string,
  triggerAction: string,
  triggerEntityId: string
): Promise<Request | null> {
  return requestRepository.findByOriginTriggerEntity(organizationId, triggerAction, triggerEntityId);
}
