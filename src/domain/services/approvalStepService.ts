import type { ApprovalStep } from "../models/approvalStep";
import type { ApprovalDelegation } from "../models/approvalDelegation";

/**
 * Returns the active (pending) step with the smallest stepOrder.
 * Returns null if there are no pending steps.
 */
export function getCurrentStep(steps: ApprovalStep[]): ApprovalStep | null {
  const pending = steps.filter((s) => s.status === "pending");
  if (pending.length === 0) return null;
  return pending.reduce((min, s) => (s.stepOrder < min.stepOrder ? s : min));
}

/**
 * Returns true if all steps are approved (or the array is empty).
 */
export function isAllApproved(steps: ApprovalStep[]): boolean {
  return steps.every((s) => s.status === "approved");
}

/**
 * Returns steps with stepOrder >= rejectedStepOrder (steps to reset on resubmit).
 */
export function getStepsToReset(
  steps: ApprovalStep[],
  rejectedStepOrder: number
): ApprovalStep[] {
  return steps.filter((s) => s.stepOrder >= rejectedStepOrder);
}

/**
 * Returns true if actorRole matches the step's approverRole.
 */
export function canApprove(step: ApprovalStep, actorRole: string): boolean {
  return step.approverRole === actorRole;
}

/**
 * Returns true if the step's deadline has passed.
 * Returns false if deadline is null (no deadline = never expired).
 */
export function isStepExpired(step: ApprovalStep, now?: Date): boolean {
  if (step.deadline === null) return false;
  const reference = now ?? new Date();
  return step.deadline < reference;
}

/**
 * Returns { allowed, delegation } for an approval action.
 *
 * - Direct role match: { allowed: true, delegation: undefined }
 * - Delegated match: { allowed: true, delegation: <the matched delegation> }
 *   When multiple delegations match (same fromUserRole → step.approverRole),
 *   the one with the most recent startDate is adopted.
 * - No match: { allowed: false }
 *
 * The delegations array should already be filtered to active and in-period
 * records (i.e. returned by findActiveByToUserId). As a defensive guard this
 * function additionally skips any delegation where isActive is false so that
 * an unfiltered list can never silently grant access.
 */
export function canApproveWithDelegation(
  step: ApprovalStep,
  actorRole: string,
  delegations: ApprovalDelegation[]
): { allowed: boolean; delegation?: ApprovalDelegation } {
  // Direct role match — no delegation needed
  if (step.approverRole === actorRole) {
    return { allowed: true, delegation: undefined };
  }

  // Find delegations where fromUserRole matches the required approverRole.
  // Defensive guard: skip inactive delegations even if callers failed to
  // pre-filter them.
  const matching = delegations.filter(
    (d) => d.isActive && d.fromUserRole === step.approverRole
  );
  if (matching.length === 0) {
    return { allowed: false };
  }

  // Adopt the delegation with the most recent startDate
  const best = matching.reduce((a, b) =>
    b.startDate > a.startDate ? b : a
  );
  return { allowed: true, delegation: best };
}
