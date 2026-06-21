import { contractRepository } from "@/infrastructure/repositories";
import type { ContractWithClient } from "@/domain/models/contract";

export async function listContracts(organizationId: string): Promise<ContractWithClient[]> {
  return contractRepository.findAllByOrganization(organizationId);
}
