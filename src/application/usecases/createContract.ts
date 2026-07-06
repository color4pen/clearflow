import {
  dealRepository,
  contractRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import { validateContractAmount, validateContractDates } from "@/domain/services/contractValidation";
import { dispatcher } from "@/domain/events";
import type { Contract, RenewalType } from "@/domain/models/contract";

export type CreateContractResult = { ok: true; contract: Contract } | { ok: false; reason: string };

export async function createContract(data: {
  dealId: string;
  organizationId: string;
  actorId: string;
  title?: string;
  contractType?: string | null;
  amount: number;
  startDate: Date;
  endDate?: Date | null;
  paymentTerms?: string | null;
  renewalType?: RenewalType;
  renewalCycle?: string | null;
}): Promise<CreateContractResult> {
  return dispatcher.runInContext(async () => {
    const deal = await dealRepository.findById(data.dealId, data.organizationId);
    if (!deal) {
      return { ok: false, reason: "案件が見つかりません" };
    }

    if (deal.phase !== "won") {
      return { ok: false, reason: "受注済みの案件にのみ契約を作成できます" };
    }

    const title = data.title ?? deal.title;
    const contractType = data.contractType !== undefined ? data.contractType : deal.contractType;
    const endDate = data.endDate !== undefined ? data.endDate : deal.estimatedEndDate;

    const amountValidation = validateContractAmount(data.amount);
    if (!amountValidation.ok) {
      return { ok: false, reason: amountValidation.reason };
    }

    const datesValidation = validateContractDates(data.startDate, endDate ?? null);
    if (!datesValidation.ok) {
      return { ok: false, reason: datesValidation.reason };
    }

    try {
      const contract = await db.transaction(async (tx) => {
        const newContract = await contractRepository.create(
          {
            organizationId: data.organizationId,
            dealId: data.dealId,
            clientId: deal.clientId,
            title,
            contractType,
            amount: data.amount,
            startDate: data.startDate,
            endDate: endDate ?? null,
            paymentTerms: data.paymentTerms ?? null,
            renewalType: data.renewalType,
            renewalCycle: data.renewalCycle ?? null,
          },
          tx
        );

        await recordAudit(
          {
            action: "contract.create",
            targetType: "contract",
            targetId: newContract.id,
            actorId: data.actorId,
            organizationId: data.organizationId,
          },
          tx
        );

        await dispatcher.dispatch({
          type: "contract.created",
          organizationId: data.organizationId,
          actorId: data.actorId,
          occurredAt: new Date(),
          payload: {
            contractId: newContract.id,
            dealId: data.dealId,
            clientId: deal.clientId,
          },
        });

        return newContract;
      });

      dispatcher.flushAsync();
      return { ok: true, contract };
    } catch {
      return {
        ok: false,
        reason: "契約の作成に失敗しました",
      };
    }
  });
}
