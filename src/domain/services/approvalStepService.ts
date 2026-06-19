import type { ApprovalStep } from "../models/approvalStep";
import type { ApprovalDelegation } from "../models/approvalDelegation";
import type { ApprovalTemplateStep, StepCondition } from "../models/approvalTemplate";

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

/**
 * Evaluates whether a step condition is satisfied by the given formData.
 *
 * - If condition is undefined, always returns true (unconditional step).
 * - Looks up formData[condition.field] and extracts a numeric value.
 *   Supports both raw numbers and { value, label } format.
 * - Returns false if the field is missing or not a valid number.
 *
 * This is a pure function with no side effects.
 */
export function evaluateStepCondition(
  condition: StepCondition | undefined,
  formData: Record<string, unknown>
): boolean {
  if (condition === undefined) return true;

  const raw = formData[condition.field];
  if (raw === undefined || raw === null) return false;

  // Support { value, label } format as well as raw numbers/strings
  let numericValue: number;
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    numericValue = typeof v === "number" ? v : Number(v);
  } else {
    numericValue = typeof raw === "number" ? raw : Number(raw);
  }

  if (!isFinite(numericValue)) return false;

  const { operator, value } = condition;
  switch (operator) {
    case "gt":  return numericValue > value;
    case "gte": return numericValue >= value;
    case "lt":  return numericValue < value;
    case "lte": return numericValue <= value;
    case "eq":  return numericValue === value;
    default:    return false;
  }
}

/**
 * Filters template steps by evaluating each step's condition against formData.
 * Steps without a condition are always included.
 * Steps with a condition are included only if the condition is satisfied.
 */
export function filterStepsByCondition(
  steps: ApprovalTemplateStep[],
  formData: Record<string, unknown>
): ApprovalTemplateStep[] {
  return steps.filter((step) => evaluateStepCondition(step.condition, formData));
}
