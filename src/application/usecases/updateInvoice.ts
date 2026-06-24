import {
  contractRepository,
  invoiceRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { validateInvoiceDates } from "@/domain/services/invoiceValidation";
import type { Invoice } from "@/domain/models/invoice";

export type UpdateInvoiceResult = { ok: true; invoice: Invoice } | { ok: false; reason: string };

export async function updateInvoice(data: {
  invoiceId: string;
  organizationId: string;
  actorId: string;
  title?: string;
  amount?: number;
  issueDate?: Date | null;
  dueDate?: Date;
  notes?: string | null;
}): Promise<UpdateInvoiceResult> {
  const invoice = await invoiceRepository.findById(data.invoiceId, data.organizationId);
  if (!invoice) {
    return { ok: false, reason: "請求が見つかりません" };
  }

  // 更新後の issueDate と dueDate を算出する（指定されたフィールドは新値、未指定は既存値を使用）
  const effectiveIssueDate = data.issueDate !== undefined ? data.issueDate : invoice.issueDate;
  const effectiveDueDate = data.dueDate !== undefined ? data.dueDate : invoice.dueDate;

  const datesValidation = validateInvoiceDates(effectiveIssueDate, effectiveDueDate);
  if (!datesValidation.ok) {
    return { ok: false, reason: datesValidation.reason };
  }

  try {
    // SERIALIZABLE 分離レベルで合計金額チェックと更新を原子的に実行する
    const updated = await db.transaction(async (tx) => {
      if (data.amount !== undefined) {
        const contract = await contractRepository.findById(invoice.contractId, data.organizationId, tx);
        if (contract && contract.renewalType === "one_time") {
          // 全請求の合計から対象請求の現在金額を差し引き、新しい金額を加算する
          const existingTotal = await invoiceRepository.sumAmountByContract(
            invoice.contractId,
            data.organizationId,
            tx
          );
          const newTotal = existingTotal - invoice.amount + data.amount;
          if (newTotal > contract.amount) {
            throw new Error(
              `請求金額の合計が契約金額を超えます（契約金額: ¥${contract.amount.toLocaleString("ja-JP")}、更新後の合計: ¥${newTotal.toLocaleString("ja-JP")}）`
            );
          }
        }
      }

      const updatedInvoice = await invoiceRepository.update(
        data.invoiceId,
        data.organizationId,
        {
          title: data.title,
          amount: data.amount,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          notes: data.notes,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "invoice.update",
          targetType: "invoice",
          targetId: data.invoiceId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return updatedInvoice;
    }, { isolationLevel: 'serializable' });

    if (!updated) {
      return { ok: false, reason: "請求の更新に失敗しました" };
    }

    return { ok: true, invoice: updated };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "請求の更新に失敗しました",
    };
  }
}
