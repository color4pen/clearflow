import {
  approvalDelegationRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";

export type DeactivateDelegationResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deactivateDelegation(data: {
  delegationId: string;
  organizationId: string;
  actorId: string;
}): Promise<DeactivateDelegationResult> {
  const updated = await approvalDelegationRepository.update(
    data.delegationId,
    data.organizationId,
    { isActive: false }
  );

  if (!updated) {
    return { ok: false, reason: "Delegation not found." };
  }

  await auditLogRepository.create({
    action: "delegation.deactivate",
    targetType: "delegation",
    targetId: data.delegationId,
    actorId: data.actorId,
    organizationId: data.organizationId,
    metadata: {
      fromUserId: updated.fromUserId,
      toUserId: updated.toUserId,
    },
  });

  return { ok: true };
}
