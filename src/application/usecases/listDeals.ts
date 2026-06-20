import { dealRepository } from "@/infrastructure/repositories";
import type { DealWithInquiry } from "@/domain/models/deal";

export async function listDeals(organizationId: string): Promise<DealWithInquiry[]> {
  return dealRepository.findAllByOrganization(organizationId);
}
