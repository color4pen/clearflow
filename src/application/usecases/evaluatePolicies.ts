import { approvalPolicyRepository } from "@/infrastructure/repositories";
import { evaluateCondition } from "@/domain/services";
import type { ApprovalPolicy } from "@/domain/models/approvalPolicy";

/**
 * Evaluates active approval policies for the given triggerAction and context.
 * Returns the list of policies that match (unconditional policies always match;
 * conditional policies are evaluated via evaluateCondition).
 */
export async function evaluatePolicies(
  organizationId: string,
  triggerAction: string,
  context: Record<string, unknown>
): Promise<ApprovalPolicy[]> {
  const policies = await approvalPolicyRepository.findActiveByTriggerAction(
    organizationId,
    triggerAction
  );

  return policies.filter((policy) => {
    if (policy.conditionField === null) {
      // Unconditional policy — always matches
      return true;
    }
    // Guard: conditionOperator and conditionValue must be non-null when conditionField is set.
    // This invariant is enforced at the DB level, but we verify at runtime to avoid unexpected
    // errors from data integrity violations (e.g. manual DB edits or migration bugs).
    if (policy.conditionOperator === null || policy.conditionValue === null) {
      console.error(
        `[evaluatePolicies] Policy ${policy.id} has conditionField set but null conditionOperator or conditionValue — skipping`
      );
      return false;
    }
    return evaluateCondition(
      policy.conditionField,
      policy.conditionOperator,
      policy.conditionValue,
      context
    );
  });
}
