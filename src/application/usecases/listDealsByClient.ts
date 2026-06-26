import { dealRepository } from "@/infrastructure/repositories";
import type { Deal } from "@/domain/models/deal";

export async function listDealsByClient(clientId: string, organizationId: string): Promise<Deal[]> {
  return dealRepository.findAllByClientId(clientId, organizationId);
}
