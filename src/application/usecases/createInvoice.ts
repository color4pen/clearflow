import {
  contractRepository,
  invoiceRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { validateInvoiceDates } from "@/domain/services/invoiceValidation";
import type { Invoice } from "@/domain/models/invoice";

export type CreateInvoiceResult = { ok: true; invoice: Invoice } | { ok: false; reason: string };

export async function createInvoice(data: {
  contractId: string;
  organizationId: string;
  actorId: string;
  title: string;
  amount: number;
  issueDate?: Date | null;
  dueDate: Date;
  notes?: string | null;
}): Promise<CreateInvoiceResult> {
  const contract = await contractRepository.findById(data.contractId, data.organizationId);
  if (!contract) {
    return { ok: false, reason: "契約が見つかりません" };
  }

  if (contract.status !== "active") {
    return { ok: false, reason: "有効な契約にのみ請求を作成できます" };
  }

  const datesValidation = validateInvoiceDates(data.issueDate ?? null, data.dueDate);
  if (!datesValidation.ok) {
    return { ok: false, reason: datesValidation.reason };
  }

  try {
    // SERIALIZABLE 分離レベルで SUM → INSERT を原子的に実行し、ファントムリードを防止する
    const invoice = await db.transaction(async (tx) => {
      // one_time 契約かつ契約金額が正値の場合に合計金額を検証する（amount=0 は移行データのため除外）
      if (contract.renewalType === "one_time" && contract.amount > 0) {
        const existingTotal = await invoiceRepository.sumAmountByContract(
          data.contractId,
          data.organizationId,
          tx
        );
        if (existingTotal + data.amount > contract.amount) {
          throw new Error(
            `請求金額の合計が契約金額を超えます（契約金額: ¥${contract.amount.toLocaleString("ja-JP")}、現在の合計: ¥${existingTotal.toLocaleString("ja-JP")}、追加金額: ¥${data.amount.toLocaleString("ja-JP")}）`
          );
        }
      }

      const newInvoice = await invoiceRepository.create(
        {
          organizationId: data.organizationId,
          contractId: data.contractId,
          title: data.title,
          amount: data.amount,
          issueDate: data.issueDate ?? null,
          dueDate: data.dueDate,
          notes: data.notes ?? null,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "invoice.create",
          targetType: "invoice",
          targetId: newInvoice.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newInvoice;
    }, { isolationLevel: 'serializable' });

    return { ok: true, invoice };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "請求の作成に失敗しました",
    };
  }
}
