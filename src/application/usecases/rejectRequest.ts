import {
  requestRepository,
  auditLogRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import { getCurrentStep } from "@/domain/services/approvalStepService";
import { db } from "@/infrastructure/db";
import type { Request } from "@/domain/models/request";

export type RejectRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function rejectRequest(data: {
  requestId: string;
  organizationId: string;
  actorId: string;
  targetStatus?: "rejected" | "revision";
  comment?: string;
}): Promise<RejectRequestResult> {
  const targetStatus = data.targetStatus ?? "rejected";

  const existing = await requestRepository.findById(
    data.requestId,
    data.organizationId
  );
  if (!existing) {
    return { ok: false, reason: "Request not found." };
  }

  const validation = validateTransition(existing.status, targetStatus);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  if (targetStatus === "revision") {
    // Revision (差し戻し) flow
    try {
      const updated = await db.transaction(async (tx) => {
        const steps = await approvalStepRepository.findByRequestId(
          data.requestId,
          data.organizationId,
          tx
        );

        const currentStep = getCurrentStep(steps);
        if (currentStep) {
          await approvalStepRepository.updateStatus(
            currentStep.id,
            data.organizationId,
            {
              status: "rejected",
              comment: data.comment ?? null,
            },
            tx
          );
        }

        const result = await requestRepository.updateStatus(
          data.requestId,
          data.organizationId,
          "revision",
          new Date(),
          tx
        );
        if (!result) {
          throw new Error("Failed to update request.");
        }

        await auditLogRepository.create(
          {
            action: "approval_step.reject",
            targetType: "request",
            targetId: data.requestId,
            actorId: data.actorId,
            organizationId: data.organizationId,
            metadata: {
              stepId: currentStep?.id ?? null,
              stepOrder: currentStep?.stepOrder ?? null,
              approverRole: currentStep?.approverRole ?? null,
              comment: data.comment ?? null,
            },
          },
          tx
        );

        return result;
      });

      return { ok: true, request: updated };
    } catch (err) {
      return {
        ok: false,
        reason:
          err instanceof Error ? err.message : "Failed to update request.",
      };
    }
  }

  // Default: final rejection (rejected terminal state)
  try {
    const updated = await db.transaction(async (tx) => {
      const result = await requestRepository.updateStatus(
        data.requestId,
        data.organizationId,
        "rejected",
        new Date(),
        tx
      );
      if (!result) {
        throw new Error("Failed to update request.");
      }

      await auditLogRepository.create(
        {
          action: "request.reject",
          targetType: "request",
          targetId: data.requestId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return result;
    });

    return { ok: true, request: updated };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to update request.",
    };
  }
}
