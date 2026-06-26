import { approvalPolicyRepository } from "@/infrastructure/repositories";
import type { ApprovalPolicy } from "@/domain/models/approvalPolicy";

export async function getApprovalPolicy(data: {
  policyId: string;
  organizationId: string;
}): Promise<ApprovalPolicy | null> {
  return approvalPolicyRepository.findById(data.policyId, data.organizationId);
}
