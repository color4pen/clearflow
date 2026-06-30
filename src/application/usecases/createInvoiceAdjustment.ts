import {
  interactionRepository,
  invoiceRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";
import type { Interaction } from "@/domain/models/interaction";

export type CreateInvoiceAdjustmentResult =
  | { ok: true; interaction: Interaction }
  | { ok: false; reason: string };

export async function createInvoiceAdjustment(data: {
  invoiceId: string;
  organizationId: string;
  actorId: string;
  summary: string;
  date?: Date;
  details?: string | null;
}): Promise<CreateInvoiceAdjustmentResult> {
  const invoice = await invoiceRepository.findById(data.invoiceId, data.organizationId);
  if (!invoice) {
    return { ok: false, reason: "請求が見つかりません" };
  }

  try {
    const interaction = await db.transaction(async (tx) => {
      const newInteraction = await interactionRepository.create(
        {
          organizationId: data.organizationId,
          kind: "note",
          invoiceId: data.invoiceId,
          date: data.date ?? new Date(),
          summary: data.summary,
          details: data.details != null
            ? { notes: data.details, challenge: null, budget: null, decisionMaker: null, timeline: null, competitors: null }
            : null,
          attendees: [],
          actionItems: [],
          createdById: data.actorId,
        },
        tx
      );

      await recordAudit(
        {
          action: "interaction.create",
          targetType: "interaction",
          targetId: newInteraction.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { kind: "note" },
        },
        tx
      );

      return newInteraction;
    });

    return { ok: true, interaction };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "請求調整の作成に失敗しました",
    };
  }
}
