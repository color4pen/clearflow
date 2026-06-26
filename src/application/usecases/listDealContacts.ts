import { dealContactRepository } from "@/infrastructure/repositories";
import type { DealContact } from "@/domain/models/deal";

export async function listDealContacts(dealId: string, organizationId: string): Promise<DealContact[]> {
  return dealContactRepository.findByDeal(dealId, organizationId);
}
