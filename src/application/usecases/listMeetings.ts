import { interactionRepository } from "@/infrastructure/repositories";
import type { Interaction } from "@/domain/models/interaction";

export async function listMeetings(dealId: string, organizationId: string): Promise<Interaction[]> {
  return interactionRepository.findAllByDeal(dealId, organizationId);
}
