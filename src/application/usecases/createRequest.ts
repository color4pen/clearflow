import {
  requestRepository,
  approvalTemplateRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import { filterStepsByCondition } from "@/domain/services";
import { dispatcher } from "@/domain/events";
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
  return dispatcher.runInContext(async () => {
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

        await recordAudit(
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

        await dispatcher.dispatch({
          type: "request.created",
          organizationId: data.organizationId,
          actorId: data.creatorId,
          occurredAt: new Date(),
          payload: {
            requestId: request.id,
            requestTitle: request.title,
            status: "draft",
          },
        });

        return request;
      });

      dispatcher.flushAsync();
      return { ok: true, request: result };
    } catch (err) {
      // 例外詳細（DB エラー文等）はクライアントに返さず、サーバー側にのみ記録する
      console.error("createRequest failed", err);
      return { ok: false, reason: "Failed to create request." };
    }
  });
}
