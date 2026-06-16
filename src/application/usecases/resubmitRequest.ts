import {
  requestRepository,
  auditLogRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import { getStepsToReset } from "@/domain/services/approvalStepService";
import { db } from "@/infrastructure/db";
import type { Request } from "@/domain/models/request";

export type ResubmitRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function resubmitRequest(data: {
  requestId: string;
  organizationId: string;
  actorId: string;
}): Promise<ResubmitRequestResult> {
  const existing = await requestRepository.findById(
    data.requestId,
    data.organizationId
  );
  if (!existing) {
    return { ok: false, reason: "Request not found." };
  }

  const validation = validateTransition(existing.status, "pending");
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const steps = await approvalStepRepository.findByRequestId(
        data.requestId,
        data.organizationId,
        tx
      );

      // Find the rejected step (the one that was sent back for revision)
      const rejectedStep = steps.find((s) => s.status === "rejected");
      const stepsToReset = rejectedStep
        ? getStepsToReset(steps, rejectedStep.stepOrder)
        : [];

      if (rejectedStep) {
        await approvalStepRepository.resetSteps(
          data.requestId,
          rejectedStep.stepOrder,
          tx
        );
      }

      const result = await requestRepository.updateStatus(
        data.requestId,
        data.organizationId,
        "pending",
        new Date(),
        tx
      );
      if (!result) {
        throw new Error("Failed to update request.");
      }

      await auditLogRepository.create(
        {
          action: "request.resubmit",
          targetType: "request",
          targetId: data.requestId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: {
            resetStepOrders: stepsToReset.map((s) => s.stepOrder),
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
        err instanceof Error ? err.message : "Failed to resubmit request.",
    };
  }
}
