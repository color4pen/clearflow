import {
  requestRepository,
  auditLogRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import {
  getCurrentStep,
  isAllApproved,
  canApprove,
} from "@/domain/services/approvalStepService";
import { db } from "@/infrastructure/db";
import type { Request } from "@/domain/models/request";

export type ApproveRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function approveRequest(data: {
  requestId: string;
  organizationId: string;
  actorId: string;
  actorRole: string;
}): Promise<ApproveRequestResult> {
  const existing = await requestRepository.findById(
    data.requestId,
    data.organizationId
  );
  if (!existing) {
    return { ok: false, reason: "Request not found." };
  }

  const steps = await approvalStepRepository.findByRequestId(
    data.requestId,
    data.organizationId
  );

  // No steps: backward-compatible single-approve flow
  if (steps.length === 0) {
    const validation = validateTransition(existing.status, "approved");
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      const updated = await db.transaction(async (tx) => {
        const result = await requestRepository.updateStatus(
          data.requestId,
          data.organizationId,
          "approved",
          new Date(),
          tx
        );
        if (!result) {
          throw new Error("Failed to update request.");
        }

        await auditLogRepository.create(
          {
            action: "request.approve",
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
        reason:
          err instanceof Error ? err.message : "Failed to update request.",
      };
    }
  }

  // Multi-step approval flow
  const transitionValidation = validateTransition(existing.status, "approved");
  if (!transitionValidation.ok) {
    return { ok: false, reason: transitionValidation.reason };
  }

  // Pre-check role authorization using outer snapshot (non-security-critical fast-fail)
  const currentStep = getCurrentStep(steps);
  if (!currentStep) {
    return { ok: false, reason: "All approval steps are already completed." };
  }

  if (!canApprove(currentStep, data.actorRole)) {
    return {
      ok: false,
      reason: `Unauthorized: role "${data.actorRole}" cannot approve this step (requires "${currentStep.approverRole}").`,
    };
  }

  try {
    const updated = await db.transaction(async (tx) => {
      // Re-fetch steps inside the transaction to get a consistent snapshot
      // and avoid TOCTOU races on isAllApproved computation
      const freshSteps = await approvalStepRepository.findByRequestId(
        data.requestId,
        data.organizationId,
        tx
      );
      const freshCurrentStep = getCurrentStep(freshSteps);
      if (!freshCurrentStep) {
        throw new Error("All approval steps are already completed.");
      }

      await approvalStepRepository.updateStatus(
        freshCurrentStep.id,
        {
          status: "approved",
          approvedBy: data.actorId,
          approvedAt: new Date(),
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "approval_step.approve",
          targetType: "request",
          targetId: data.requestId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: {
            stepId: freshCurrentStep.id,
            stepOrder: freshCurrentStep.stepOrder,
            approverRole: freshCurrentStep.approverRole,
          },
        },
        tx
      );

      // Compute updated steps based on fresh snapshot
      const updatedSteps = freshSteps.map((s) =>
        s.id === freshCurrentStep.id
          ? {
              ...s,
              status: "approved" as const,
              approvedBy: data.actorId,
              approvedAt: new Date(),
            }
          : s
      );

      if (isAllApproved(updatedSteps)) {
        const result = await requestRepository.updateStatus(
          data.requestId,
          data.organizationId,
          "approved",
          new Date(),
          tx
        );
        if (!result) {
          throw new Error("Failed to update request status.");
        }

        await auditLogRepository.create(
          {
            action: "request.approve",
            targetType: "request",
            targetId: data.requestId,
            actorId: data.actorId,
            organizationId: data.organizationId,
          },
          tx
        );

        return result;
      }

      // More steps remain — request stays pending
      return existing;
    });

    return { ok: true, request: updated };
  } catch (err) {
    return {
      ok: false,
      reason:
        err instanceof Error ? err.message : "Failed to approve request.",
    };
  }
}
