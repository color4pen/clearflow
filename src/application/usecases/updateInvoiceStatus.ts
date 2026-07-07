import {
  invoiceRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import { validateInvoiceTransition } from "@/domain/services/invoiceTransition";
import { dispatcher } from "@/domain/events";
import type { Invoice, InvoiceStatus } from "@/domain/models/invoice";

export type UpdateInvoiceStatusResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; reason: string };

export async function updateInvoiceStatus(data: {
  invoiceId: string;
  organizationId: string;
  actorId: string;
  newStatus: InvoiceStatus;
  paidAt?: Date;
}): Promise<UpdateInvoiceStatusResult> {
  return dispatcher.runInContext(async () => {
    const invoice = await invoiceRepository.findById(data.invoiceId, data.organizationId);
    if (!invoice) {
      return { ok: false, reason: "請求が見つかりません" };
    }

    const validation = validateInvoiceTransition(invoice.status, data.newStatus);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    // 遷移先に応じた追加フィールドを決定する
    const additionalFields: Partial<{ invoicedAt: Date; paidAt: Date }> = {};
    if (data.newStatus === "invoiced") {
      additionalFields.invoicedAt = new Date();
    } else if (data.newStatus === "paid") {
      additionalFields.paidAt = data.paidAt ?? new Date();
    }

    try {
      const updated = await db.transaction(async (tx) => {
        const updatedInvoice = await invoiceRepository.updateStatus(
          data.invoiceId,
          data.organizationId,
          data.newStatus,
          additionalFields,
          invoice.version,
          tx
        );

        if (!updatedInvoice) {
          return null;
        }

        await recordAudit(
          {
            action: "invoice.update_status",
            targetType: "invoice",
            targetId: data.invoiceId,
            actorId: data.actorId,
            organizationId: data.organizationId,
            metadata: {
              fromStatus: invoice.status,
              toStatus: data.newStatus,
            },
          },
          tx
        );

        if (data.newStatus === "paid") {
          await dispatcher.dispatch({
            type: "invoice.paid",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              invoiceId: data.invoiceId,
              contractId: invoice.contractId,
            },
          });
        } else if (data.newStatus === "overdue") {
          await dispatcher.dispatch({
            type: "invoice.overdue",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              invoiceId: data.invoiceId,
              contractId: invoice.contractId,
            },
          });
        }
        // newStatus === "invoiced" → no event

        return updatedInvoice;
      });

      if (!updated) {
        return { ok: false, reason: "この請求は他のユーザーによって更新されました。画面を更新してください" };
      }

      dispatcher.flushAsync();
      return { ok: true, invoice: updated };
    } catch {
      return {
        ok: false,
        reason: "ステータスの更新に失敗しました",
      };
    }
  });
}
