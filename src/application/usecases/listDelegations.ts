import { approvalDelegationRepository } from "@/infrastructure/repositories";
import type { ApprovalDelegation } from "@/domain/models/approvalDelegation";

export async function listDelegations(data: {
  organizationId: string;
}): Promise<ApprovalDelegation[]> {
  return approvalDelegationRepository.findByOrganization(data.organizationId);
}
