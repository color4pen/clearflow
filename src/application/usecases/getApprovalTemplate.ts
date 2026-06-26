import { approvalTemplateRepository } from "@/infrastructure/repositories";
import type { ApprovalTemplate } from "@/domain/models/approvalTemplate";

export async function getApprovalTemplate(data: {
  templateId: string;
  organizationId: string;
}): Promise<ApprovalTemplate | null> {
  return approvalTemplateRepository.findById(data.templateId, data.organizationId);
}
