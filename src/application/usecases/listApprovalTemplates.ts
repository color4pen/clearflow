import { approvalTemplateRepository } from "@/infrastructure/repositories";
import type { ApprovalTemplate } from "@/domain/models/approvalTemplate";

export async function listApprovalTemplates(data: {
  organizationId: string;
}): Promise<ApprovalTemplate[]> {
  return approvalTemplateRepository.findByOrganization(data.organizationId);
}
