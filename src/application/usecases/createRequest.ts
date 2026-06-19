import {
  requestRepository,
  auditLogRepository,
  approvalTemplateRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { filterStepsByCondition } from "@/domain/services";
import { deliverWebhookEvent } from "@/infrastructure/webhookDelivery";
import type { Request } from "@/domain/models/request";

export type CreateRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function createRequest(data: {
  title: string;
  templateId: string;
  formData: Record<string, unknown>;
  organizationId: string;
  creatorId: string;
}): Promise<CreateRequestResult> {
  // Fetch the explicitly selected template
  const selectedTemplate = await approvalTemplateRepository.findById(
    data.templateId,
    data.organizationId
  );

  if (!selectedTemplate) {
    return {
      ok: false,
      reason: "テンプレートが見つかりません。",
    };
  }

  // Filter steps by condition (conditional steps only generated when condition is satisfied)
  const filteredSteps = filterStepsByCondition(selectedTemplate.steps, data.formData);

  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const request = await requestRepository.create(
        {
          title: data.title,
          formData: data.formData,
          templateId: data.templateId,
          organizationId: data.organizationId,
          creatorId: data.creatorId,
        },
        tx
      );

      await approvalStepRepository.createMany(
        filteredSteps.map((s) => ({
          requestId: request.id,
          stepOrder: s.stepOrder,
          approverRole: s.approverRole,
          organizationId: data.organizationId,
          deadline: s.deadlineHours != null
            ? new Date(now.getTime() + s.deadlineHours * 60 * 60 * 1000)
            : null,
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
          },
        },
        tx
      );

      return request;
    });

    void deliverWebhookEvent({
      organizationId: data.organizationId,
      event: "request.created",
      data: { requestId: result.id, requestTitle: result.title, actorId: data.creatorId, status: "draft" },
    });

    return { ok: true, request: result };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to create request.",
    };
  }
}
