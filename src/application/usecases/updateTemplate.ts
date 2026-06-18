import {
  approvalTemplateRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { ApprovalTemplate, ApprovalTemplateStep } from "@/domain/models/approvalTemplate";

export type UpdateTemplateResult =
  | { ok: true; template: ApprovalTemplate }
  | { ok: false; reason: string };

export async function updateTemplate(data: {
  id: string;
  name?: string;
  steps?: ApprovalTemplateStep[];
  minAmount?: number | null;
  maxAmount?: number | null;
  organizationId: string;
  actorId: string;
}): Promise<UpdateTemplateResult> {
  try {
    const template = await db.transaction(async (tx) => {
      const updated = await approvalTemplateRepository.updateById(
        data.id,
        data.organizationId,
        {
          name: data.name,
          steps: data.steps,
          minAmount: data.minAmount,
          maxAmount: data.maxAmount,
        },
        tx
      );

      if (!updated) {
        throw new Error("テンプレートが見つかりません");
      }

      await auditLogRepository.create(
        {
          action: "template.update",
          targetType: "template",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { name: data.name },
        },
        tx
      );

      return updated;
    });

    return { ok: true, template };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "テンプレートの更新に失敗しました",
    };
  }
}
