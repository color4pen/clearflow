import { interactionRepository } from "@/infrastructure/repositories";
import type { Interaction } from "@/domain/models/interaction";

export async function listInteractionsByInvoice(
  invoiceId: string,
  organizationId: string
): Promise<Interaction[]> {
  return interactionRepository.findAllByInvoice(invoiceId, organizationId);
}
