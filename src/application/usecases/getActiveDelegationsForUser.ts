import { approvalDelegationRepository } from "@/infrastructure/repositories";
import type { ApprovalDelegation } from "@/domain/models/approvalDelegation";

/**
 * Returns active delegations assigned to the given user at the specified time.
 * Used to determine if a user can approve on behalf of another role.
 */
export async function getActiveDelegationsForUser(data: {
  userId: string;
  organizationId: string;
  at?: Date;
}): Promise<ApprovalDelegation[]> {
  const now = data.at ?? new Date();
  return approvalDelegationRepository.findActiveByToUserId(
    data.userId,
    data.organizationId,
    now
  );
}
