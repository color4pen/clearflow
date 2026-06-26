import { contractRepository } from "@/infrastructure/repositories";
import type { Contract } from "@/domain/models/contract";

export async function listContractsByDeal(dealId: string, organizationId: string): Promise<Contract[]> {
  return contractRepository.findAllByDealId(dealId, organizationId);
}
