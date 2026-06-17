import { approvalStepRepository } from "@/infrastructure/repositories";
import type { ApprovalStep } from "@/domain/models/approvalStep";

export async function getApprovalSteps(data: {
  requestId: string;
  organizationId: string;
}): Promise<ApprovalStep[]> {
  return approvalStepRepository.findByRequestId(
    data.requestId,
    data.organizationId
  );
}
