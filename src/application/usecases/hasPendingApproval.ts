import { requestRepository } from "@/infrastructure/repositories";

export async function hasPendingApproval(organizationId: string, triggerEntityId: string): Promise<boolean> {
  return requestRepository.existsPendingByTriggerEntityId(organizationId, triggerEntityId);
}
