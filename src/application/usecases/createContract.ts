import {
  dealRepository,
  contractRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Contract, RenewalType } from "@/domain/models/contract";

export type CreateContractResult = { ok: true; contract: Contract } | { ok: false; reason: string };

export async function createContract(data: {
  dealId: string;
  organizationId: string;
  actorId: string;
  title?: string;
  contractType?: string | null;
  amount?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  paymentTerms?: string | null;
  renewalType?: RenewalType;
  renewalCycle?: string | null;
}): Promise<CreateContractResult> {
  const deal = await dealRepository.findById(data.dealId, data.organizationId);
  if (!deal) {
    return { ok: false, reason: "案件が見つかりません" };
  }

  if (deal.phase !== "won") {
    return { ok: false, reason: "受注済みの案件にのみ契約を作成できます" };
  }

  const existing = await contractRepository.findByDealId(data.dealId, data.organizationId);
  if (existing) {
    return { ok: false, reason: "この案件にはすでに契約が存在します" };
  }

  // Deal の情報を初期値として使用し、明示的に渡された値で上書きする
  const title = data.title ?? deal.title;
  const contractType = data.contractType !== undefined ? data.contractType : deal.contractType;
  const amount = data.amount !== undefined ? data.amount : deal.estimatedAmount;
  const startDate = data.startDate !== undefined ? data.startDate : deal.estimatedStartDate;
  const endDate = data.endDate !== undefined ? data.endDate : deal.estimatedEndDate;

  try {
    const contract = await db.transaction(async (tx) => {
      const newContract = await contractRepository.create(
        {
          organizationId: data.organizationId,
          dealId: data.dealId,
          clientId: deal.clientId,
          title,
          contractType,
          amount,
          startDate,
          endDate,
          paymentTerms: data.paymentTerms ?? null,
          renewalType: data.renewalType,
          renewalCycle: data.renewalCycle ?? null,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "contract.create",
          targetType: "contract",
          targetId: newContract.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newContract;
    });

    return { ok: true, contract };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "契約の作成に失敗しました",
    };
  }
}
