import {
  requestRepository,
  auditLogRepository,
  approvalStepRepository,
  approvalDelegationRepository,
  inquiryRepository,
  dealRepository,
} from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import {
  getCurrentStep,
  isAllApproved,
  canApproveWithDelegation,
  isStepExpired,
} from "@/domain/services/approvalStepService";
import { db } from "@/infrastructure/db";
import { deliverWebhookEvent } from "@/infrastructure/webhookDelivery";
import type { Request } from "@/domain/models/request";
import type { ApprovalStep } from "@/domain/models/approvalStep";

const OPTIMISTIC_LOCK_ERROR = "この申請は他のユーザーによって更新されました。画面を更新してください";

/**
 * 全ステップ承認後の連動処理。
 * sourceType に応じて Deal 作成または Deal フェーズ進行を行う。
 * 失敗しても承認自体には影響しない（エラーは audit log に記録）。
 */
async function runPostApprovalLinkage(
  request: Request,
  actorId: string,
  organizationId: string
): Promise<void> {
  const { sourceType, sourceId } = request;
  if (!sourceType || !sourceId) return;

  if (sourceType === "inquiry") {
    try {
      const inquiry = await inquiryRepository.findById(sourceId, organizationId);
      if (!inquiry) throw new Error(`引き合いが見つかりません: ${sourceId}`);

      const deal = await dealRepository.create({
        organizationId,
        inquiryId: sourceId,
        title: inquiry.title,
      });

      await auditLogRepository.create({
        action: "deal.create",
        targetType: "deal",
        targetId: deal.id,
        actorId,
        organizationId,
        metadata: { sourceRequestId: request.id, inquiryId: sourceId },
      });
    } catch (err) {
      // Audit log write is best-effort: if it fails, swallow silently so that
      // the catch block itself cannot propagate an exception back to approveRequest.
      // The approval transaction is already committed; D3 requires linkage failures
      // to never affect the approval result.
      try {
        await auditLogRepository.create({
          action: "approval.linkage_failed",
          targetType: "request",
          targetId: request.id,
          actorId,
          organizationId,
          metadata: {
            sourceType,
            sourceId,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      } catch {
        // Discard: audit log write failure must not reach the caller.
      }
    }
    return;
  }

  if (sourceType === "deal") {
    try {
      const deal = await dealRepository.findById(sourceId, organizationId);
      if (!deal) throw new Error(`案件が見つかりません: ${sourceId}`);

      const updated = await dealRepository.updatePhase(
        sourceId,
        organizationId,
        "won",
        deal.estimateRequestId,
        deal.version
      );
      if (!updated) throw new Error("楽観ロック失敗: 案件フェーズの更新に競合が発生しました");

      await auditLogRepository.create({
        action: "deal.updatePhase",
        targetType: "deal",
        targetId: sourceId,
        actorId,
        organizationId,
        metadata: { fromPhase: deal.phase, toPhase: "won", sourceRequestId: request.id },
      });
    } catch (err) {
      // Audit log write is best-effort: if it fails, swallow silently so that
      // the catch block itself cannot propagate an exception back to approveRequest.
      // The approval transaction is already committed; D3 requires linkage failures
      // to never affect the approval result.
      try {
        await auditLogRepository.create({
          action: "approval.linkage_failed",
          targetType: "request",
          targetId: request.id,
          actorId,
          organizationId,
          metadata: {
            sourceType,
            sourceId,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      } catch {
        // Discard: audit log write failure must not reach the caller.
      }
    }
  }
}

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

      await runPostApprovalLinkage(updated, data.actorId, data.organizationId);

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
      // The outer canApproveWithDelegation check used the pre-TX snapshot; if another
      // transaction approved Step N between then and now, freshCurrentStep
      // may be Step N+1 with a different approverRole requirement.
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

    // If all steps are approved, also deliver request.approved and run linkage
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

      await runPostApprovalLinkage(txResult.request, data.actorId, data.organizationId);
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
