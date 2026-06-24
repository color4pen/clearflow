import {
  contractRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { canContractTransition } from "@/domain/services";
import { dispatcher } from "@/domain/events";
import type { Contract, ContractStatus } from "@/domain/models/contract";

export type UpdateContractStatusResult =
  | { ok: true; contract: Contract }
  | { ok: false; reason: string };

export async function updateContractStatus(data: {
  contractId: string;
  organizationId: string;
  actorId: string;
  newStatus: ContractStatus;
}): Promise<UpdateContractStatusResult> {
  return dispatcher.runInContext(async () => {
    const contract = await contractRepository.findById(data.contractId, data.organizationId);
    if (!contract) {
      return { ok: false, reason: "契約が見つかりません" };
    }

    if (!canContractTransition(contract.status, data.newStatus)) {
      return {
        ok: false,
        reason: `ステータスを "${contract.status}" から "${data.newStatus}" に変更することはできません`,
      };
    }

    try {
      const updated = await db.transaction(async (tx) => {
        const updatedContract = await contractRepository.update(
          data.contractId,
          data.organizationId,
          { status: data.newStatus },
          tx
        );

        await auditLogRepository.create(
          {
            action: "contract.updateStatus",
            targetType: "contract",
            targetId: data.contractId,
            actorId: data.actorId,
            organizationId: data.organizationId,
            metadata: {
              fromStatus: contract.status,
              toStatus: data.newStatus,
            },
          },
          tx
        );

        if (data.newStatus === "completed") {
          await dispatcher.dispatch({
            type: "contract.completed",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: { contractId: data.contractId },
          });
        } else if (data.newStatus === "cancelled") {
          await dispatcher.dispatch({
            type: "contract.cancelled",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: { contractId: data.contractId },
          });
        }

        return updatedContract;
      });

      if (!updated) {
        return { ok: false, reason: "ステータスの更新に失敗しました" };
      }

      dispatcher.flushAsync();
      return { ok: true, contract: updated };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "ステータスの更新に失敗しました",
      };
    }
  });
}
