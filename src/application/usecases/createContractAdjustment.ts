import {
  interactionRepository,
  contractRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";
import type { Interaction } from "@/domain/models/interaction";

export type CreateContractAdjustmentResult =
  | { ok: true; interaction: Interaction }
  | { ok: false; reason: string };

export async function createContractAdjustment(data: {
  contractId: string;
  organizationId: string;
  actorId: string;
  summary: string;
  date?: Date;
  details?: string | null;
}): Promise<CreateContractAdjustmentResult> {
  const contract = await contractRepository.findById(data.contractId, data.organizationId);
  if (!contract) {
    return { ok: false, reason: "契約が見つかりません" };
  }

  try {
    const interaction = await db.transaction(async (tx) => {
      const newInteraction = await interactionRepository.create(
        {
          organizationId: data.organizationId,
          kind: "note",
          contractId: data.contractId,
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
      reason: err instanceof Error ? err.message : "契約調整の作成に失敗しました",
    };
  }
}
