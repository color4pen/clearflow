import { interactionRepository } from "@/infrastructure/repositories";
import type { Interaction } from "@/domain/models/interaction";

export async function listInteractionsByContract(
  contractId: string,
  organizationId: string
): Promise<Interaction[]> {
  return interactionRepository.findAllByContract(contractId, organizationId);
}
