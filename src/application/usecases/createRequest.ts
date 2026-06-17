import {
  requestRepository,
  auditLogRepository,
  approvalTemplateRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { selectTemplate } from "@/domain/services";
import type { Request } from "@/domain/models/request";

export type CreateRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function createRequest(data: {
  title: string;
  description?: string | null;
  amount?: number | null;
  organizationId: string;
  creatorId: string;
}): Promise<CreateRequestResult> {
  const amount = data.amount ?? null;

  // Fetch candidate templates filtered by amount condition
  const templates = await approvalTemplateRepository.findByOrganizationForAmount(
    data.organizationId,
    amount
  );

  // Select the most appropriate template
  const selectedTemplate = selectTemplate(templates, amount);

  if (!selectedTemplate) {
    return {
      ok: false,
      reason: "適用可能な承認テンプレートが見つかりません。",
    };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const request = await requestRepository.create(
        {
          title: data.title,
          description: data.description ?? null,
          amount,
          organizationId: data.organizationId,
          creatorId: data.creatorId,
        },
        tx
      );

      await approvalStepRepository.createMany(
        selectedTemplate.steps.map((s) => ({
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
          metadata: {
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            amount,
          },
        },
        tx
      );

      return request;
    });

    return { ok: true, request: result };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to create request.",
    };
  }
}
