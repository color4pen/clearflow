import {
  approvalTemplateRepository,
  requestRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";

export type DeleteTemplateResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deleteTemplate(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<DeleteTemplateResult> {
  // Check if the template is used by any pending requests
  const isInUse = await requestRepository.existsPendingByTemplateId(
    data.id,
    data.organizationId
  );

  if (isInUse) {
    return {
      ok: false,
      reason: "このテンプレートを使用中の承認待ちリクエストがあるため削除できません",
    };
  }

  try {
    await db.transaction(async (tx) => {
      await approvalTemplateRepository.deleteById(data.id, data.organizationId, tx);

      await recordAudit(
        {
          action: "template.delete",
          targetType: "template",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "テンプレートの削除に失敗しました",
    };
  }
}
