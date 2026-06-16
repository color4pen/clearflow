import type { ApprovalStep } from "../models/approvalStep";

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
