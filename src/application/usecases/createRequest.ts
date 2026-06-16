import {
  requestRepository,
  auditLogRepository,
  approvalTemplateRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Request } from "@/domain/models/request";

export async function createRequest(data: {
  title: string;
  description?: string | null;
  organizationId: string;
  creatorId: string;
  templateId?: string;
}): Promise<Request> {
  if (data.templateId) {
    // Template-based creation: use transaction to atomically create request + steps
    const template = await approvalTemplateRepository.findById(
      data.templateId,
      data.organizationId
    );
    if (!template) {
      throw new Error(`Approval template "${data.templateId}" not found.`);
    }

    const result = await db.transaction(async (tx) => {
      const request = await requestRepository.create(
        {
          title: data.title,
          description: data.description ?? null,
          organizationId: data.organizationId,
          creatorId: data.creatorId,
        },
        tx
      );

      await approvalStepRepository.createMany(
        template.steps.map((s) => ({
          requestId: request.id,
          stepOrder: s.stepOrder,
          approverRole: s.approverRole,
          organizationId: data.organizationId,
        })),
        tx
      );

      await auditLogRepository.create(
        {
          action: "request.create",
          targetType: "request",
          targetId: request.id,
          actorId: data.creatorId,
          organizationId: data.organizationId,
          metadata: { templateId: data.templateId },
        },
        tx
      );

      return request;
    });

    return result;
  }

  // No template: traditional creation without steps
  const request = await requestRepository.create({
    title: data.title,
    description: data.description ?? null,
    organizationId: data.organizationId,
    creatorId: data.creatorId,
  });

  await auditLogRepository.create({
    action: "request.create",
    targetType: "request",
    targetId: request.id,
    actorId: data.creatorId,
    organizationId: data.organizationId,
  });

  return request;
}
