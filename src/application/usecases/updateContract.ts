import {
  contractRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Contract, RenewalType } from "@/domain/models/contract";

export type UpdateContractResult = { ok: true; contract: Contract } | { ok: false; reason: string };

export async function updateContract(data: {
  contractId: string;
  organizationId: string;
  actorId: string;
  title?: string;
  contractType?: string | null;
  amount?: number;
  startDate?: Date;
  endDate?: Date | null;
  paymentTerms?: string | null;
  renewalType?: RenewalType;
  renewalCycle?: string | null;
}): Promise<UpdateContractResult> {
  const contract = await contractRepository.findById(data.contractId, data.organizationId);
  if (!contract) {
    return { ok: false, reason: "契約が見つかりません" };
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const updatedContract = await contractRepository.update(
        data.contractId,
        data.organizationId,
        {
          title: data.title,
          contractType: data.contractType,
          amount: data.amount,
          startDate: data.startDate,
          endDate: data.endDate,
          paymentTerms: data.paymentTerms,
          renewalType: data.renewalType,
          renewalCycle: data.renewalCycle,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "contract.update",
          targetType: "contract",
          targetId: data.contractId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return updatedContract;
    });

    if (!updated) {
      return { ok: false, reason: "契約の更新に失敗しました" };
    }
    return { ok: true, contract: updated };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "契約の更新に失敗しました",
    };
  }
}
