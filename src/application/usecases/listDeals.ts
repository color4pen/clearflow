import { dealRepository } from "@/infrastructure/repositories";
import type { DealWithDetails } from "@/domain/models/deal";

export async function listDeals(organizationId: string): Promise<DealWithDetails[]> {
  return dealRepository.findAllByOrganization(organizationId);
}
