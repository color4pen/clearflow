import {
  approvalTemplateRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { ApprovalTemplate, ApprovalTemplateStep, TemplateField } from "@/domain/models/approvalTemplate";

export type CreateTemplateResult =
  | { ok: true; template: ApprovalTemplate }
  | { ok: false; reason: string };

export async function createTemplate(data: {
  name: string;
  steps: ApprovalTemplateStep[];
  fields?: TemplateField[];
  organizationId: string;
  actorId: string;
}): Promise<CreateTemplateResult> {
  try {
    const template = await db.transaction(async (tx) => {
      const t = await approvalTemplateRepository.create(
        {
          name: data.name,
          organizationId: data.organizationId,
          steps: data.steps,
          fields: data.fields ?? [],
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "template.create",
          targetType: "template",
          targetId: t.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { name: data.name },
        },
        tx
      );

      return t;
    });

    return { ok: true, template };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "テンプレートの作成に失敗しました",
    };
  }
}
