import {
  approvalTemplateRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { ApprovalTemplate, ApprovalTemplateStep, TemplateField } from "@/domain/models/approvalTemplate";

export type UpdateTemplateResult =
  | { ok: true; template: ApprovalTemplate }
  | { ok: false; reason: string };

export async function updateTemplate(data: {
  id: string;
  name?: string;
  steps?: ApprovalTemplateStep[];
  fields?: TemplateField[];
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
          fields: data.fields,
        },
        tx
      );

      if (!updated) {
        throw new Error("テンプレートが見つかりません");
      }

      await recordAudit(
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
    // 例外詳細（DB エラー文等）はクライアントに返さず、サーバー側にのみ記録する
    console.error("updateTemplate failed", err);
    return { ok: false, reason: "テンプレートの更新に失敗しました" };
  }
}
