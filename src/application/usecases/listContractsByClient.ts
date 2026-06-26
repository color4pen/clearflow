import { contractRepository } from "@/infrastructure/repositories";
import type { Contract } from "@/domain/models/contract";

export async function listContractsByClient(clientId: string, organizationId: string): Promise<Contract[]> {
  return contractRepository.findAllByClientId(clientId, organizationId);
}
