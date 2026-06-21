import { contractRepository } from "@/infrastructure/repositories";
import type { Contract } from "@/domain/models/contract";

export async function getContract(data: {
  contractId: string;
  organizationId: string;
}): Promise<Contract | null> {
  return contractRepository.findById(data.contractId, data.organizationId);
}
