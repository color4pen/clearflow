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
  isStepExpired,
} from "@/domain/services/approvalStepService";
import { db } from "@/infrastructure/db";
import { deliverWebhookEvent } from "@/infrastructure/webhookDelivery";
import type { Request } from "@/domain/models/request";
import type { ApprovalStep } from "@/domain/models/approvalStep";

const OPTIMISTIC_LOCK_ERROR = "この申請は他のユーザーによって更新されました。画面を更新してください";

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
          existing.version,
          tx
        );
        if (!result) {
          throw new Error(OPTIMISTIC_LOCK_ERROR);
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

      void deliverWebhookEvent({
        organizationId: data.organizationId,
        event: "request.approved",
        data: { requestId: updated.id, requestTitle: updated.title, actorId: data.actorId, status: "approved" },
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

  // Pre-check: deadline fast-fail (non-security-critical)
  if (isStepExpired(currentStep)) {
    return { ok: false, reason: "この承認ステップの期限が切れています" };
  }

  try {
    const txResult = await db.transaction(async (tx): Promise<{ request: Request; approvedStep: ApprovalStep | null; allApproved: boolean }> => {
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

      // Re-validate role against the fresh step inside the transaction.
      // The outer canApprove check used the pre-TX snapshot; if another
      // transaction approved Step N between then and now, freshCurrentStep
      // may be Step N+1 with a different approverRole requirement.
      if (!canApprove(freshCurrentStep, data.actorRole)) {
        throw new Error(
          `Unauthorized: role "${data.actorRole}" cannot approve this step (requires "${freshCurrentStep.approverRole}").`
        );
      }

      // TOCTOU防止: TX内で再チェック
      if (isStepExpired(freshCurrentStep)) {
        throw new Error("この承認ステップの期限が切れています");
      }

      const updatedStep = await approvalStepRepository.updateStatus(
        freshCurrentStep.id,
        data.organizationId,
        {
          status: "approved",
          approvedBy: data.actorId,
          approvedAt: new Date(),
        },
        freshCurrentStep.version,
        tx
      );
      if (!updatedStep) {
        throw new Error(OPTIMISTIC_LOCK_ERROR);
      }

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
        // Use existing.version (the pre-TX outer snapshot) as the optimistic
        // lock token. This ensures that if a concurrent operation (e.g.
        // rejectRequest) committed between the outer findById and now, its
        // version increment causes this UPDATE to match 0 rows and the
        // transaction rolls back — preventing an invalid rejected→approved
        // state transition. Using freshRequest.version would silently accept
        // a concurrent write and allow the invalid transition.
        const result = await requestRepository.updateStatus(
          data.requestId,
          data.organizationId,
          "approved",
          new Date(),
          existing.version,
          tx
        );
        if (!result) {
          throw new Error(OPTIMISTIC_LOCK_ERROR);
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

        return { request: result, approvedStep: freshCurrentStep, allApproved: true };
      }

      // More steps remain — request stays pending
      return { request: existing, approvedStep: freshCurrentStep, allApproved: false };
    });

    // Deliver step.approved event
    void deliverWebhookEvent({
      organizationId: data.organizationId,
      event: "step.approved",
      data: {
        requestId: data.requestId,
        requestTitle: existing.title,
        actorId: data.actorId,
        status: "pending",
        metadata: {
          stepId: txResult.approvedStep?.id,
          stepOrder: txResult.approvedStep?.stepOrder,
          approverRole: txResult.approvedStep?.approverRole,
        },
      },
    });

    // If all steps are approved, also deliver request.approved
    if (txResult.allApproved) {
      void deliverWebhookEvent({
        organizationId: data.organizationId,
        event: "request.approved",
        data: {
          requestId: txResult.request.id,
          requestTitle: txResult.request.title,
          actorId: data.actorId,
          status: "approved",
        },
      });
    }

    return { ok: true, request: txResult.request };
  } catch (err) {
    return {
      ok: false,
      reason:
        err instanceof Error ? err.message : "Failed to approve request.",
    };
  }
}
