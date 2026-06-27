import {
  approvalDelegationRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";

export type DeactivateDelegationResult =
  | { ok: true }
  | { ok: false; reason: string };

const NOT_FOUND = "DELEGATION_NOT_FOUND" as const;

export async function deactivateDelegation(data: {
  delegationId: string;
  organizationId: string;
  actorId: string;
}): Promise<DeactivateDelegationResult> {
  try {
    await db.transaction(async (tx) => {
      const updated = await approvalDelegationRepository.update(
        data.delegationId,
        data.organizationId,
        { isActive: false },
        tx
      );

      if (!updated) {
        // Throw a sentinel to surface the "not found" result outside the tx.
        // Nothing was written, so the rollback is a no-op.
        throw new Error(NOT_FOUND);
      }

      await recordAudit(
        {
          action: "delegation.deactivate",
          targetType: "delegation",
          targetId: data.delegationId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: {
            fromUserId: updated.fromUserId,
            toUserId: updated.toUserId,
          },
        },
        tx
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message === NOT_FOUND) {
      return { ok: false, reason: "Delegation not found." };
    }
    throw err;
  }

  return { ok: true };
}
