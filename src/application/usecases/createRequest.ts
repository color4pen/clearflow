import {
  requestRepository,
  auditLogRepository,
  approvalTemplateRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Request } from "@/domain/models/request";

export type CreateRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function createRequest(data: {
  title: string;
  description?: string | null;
  organizationId: string;
  creatorId: string;
  templateId?: string;
}): Promise<CreateRequestResult> {
  if (data.templateId) {
    // Template-based creation: use transaction to atomically create request + steps
    const template = await approvalTemplateRepository.findById(
      data.templateId,
      data.organizationId
    );
    if (!template) {
      return {
        ok: false,
        reason: `Approval template "${data.templateId}" not found.`,
      };
    }

    try {
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

      return { ok: true, request: result };
    } catch (err) {
      return {
        ok: false,
        reason:
          err instanceof Error ? err.message : "Failed to create request.",
      };
    }
  }

  // No template: wrap in transaction so audit log and request creation are atomic
  try {
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

      await auditLogRepository.create(
        {
          action: "request.create",
          targetType: "request",
          targetId: request.id,
          actorId: data.creatorId,
          organizationId: data.organizationId,
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
