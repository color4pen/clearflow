import {
  requestRepository,
  auditLogRepository,
  approvalStepRepository,
  approvalDelegationRepository,
} from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import {
  getCurrentStep,
  isAllApproved,
  canApproveWithDelegation,
  isStepExpired,
} from "@/domain/services/approvalStepService";
import { db } from "@/infrastructure/db";
import { dispatcher } from "@/domain/events";
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
  return dispatcher.runInContext(async () => {
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

          dispatcher.dispatch({
            type: "request.approved",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              requestId: result.id,
              requestTitle: result.title,
              status: "approved",
            },
          });

          return result;
        });

        dispatcher.flushAsync();
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

    // Fetch delegations for pre-TX fast-fail check
    const preTxDelegations = await approvalDelegationRepository.findActiveByToUserId(
      data.actorId,
      data.organizationId,
      new Date()
    );
    const preTxCheck = canApproveWithDelegation(currentStep, data.actorRole, preTxDelegations);
    if (!preTxCheck.allowed) {
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

        // Re-fetch delegations inside the transaction (TOCTOU防止)
        const freshDelegations = await approvalDelegationRepository.findActiveByToUserId(
          data.actorId,
          data.organizationId,
          new Date(),
          tx
        );

        // Re-validate role against the fresh step inside the transaction.
        const txCheck = canApproveWithDelegation(freshCurrentStep, data.actorRole, freshDelegations);
        if (!txCheck.allowed) {
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

        // Build audit metadata — include delegatedFrom if approval was delegated
        const auditMetadata: Record<string, unknown> = {
          stepId: freshCurrentStep.id,
          stepOrder: freshCurrentStep.stepOrder,
          approverRole: freshCurrentStep.approverRole,
        };
        if (txCheck.delegation) {
          auditMetadata.delegatedFrom = txCheck.delegation.fromUserId;
        }

        await auditLogRepository.create(
          {
            action: "approval_step.approve",
            targetType: "request",
            targetId: data.requestId,
            actorId: data.actorId,
            organizationId: data.organizationId,
            metadata: auditMetadata,
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

        // Dispatch step.approved event
        dispatcher.dispatch({
          type: "step.approved",
          organizationId: data.organizationId,
          actorId: data.actorId,
          occurredAt: new Date(),
          payload: {
            requestId: data.requestId,
            requestTitle: existing.title,
            status: "pending",
            metadata: {
              stepId: freshCurrentStep.id,
              stepOrder: freshCurrentStep.stepOrder,
              approverRole: freshCurrentStep.approverRole,
            },
          },
        });

        if (isAllApproved(updatedSteps)) {
          // Use existing.version (the pre-TX outer snapshot) as the optimistic
          // lock token.
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

          // Dispatch request.approved event when all steps complete
          dispatcher.dispatch({
            type: "request.approved",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              requestId: result.id,
              requestTitle: result.title,
              status: "approved",
            },
          });

          return { request: result, approvedStep: freshCurrentStep, allApproved: true };
        }

        // More steps remain — request stays pending
        return { request: existing, approvedStep: freshCurrentStep, allApproved: false };
      });

      dispatcher.flushAsync();
      return { ok: true, request: txResult.request };
    } catch (err) {
      return {
        ok: false,
        reason:
          err instanceof Error ? err.message : "Failed to approve request.",
      };
    }
  });
}
