import { organizationRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";

export type UpdateOrganizationResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function updateOrganization(data: {
  organizationId: string;
  actorId: string;
  name: string;
}): Promise<UpdateOrganizationResult> {
  try {
    await db.transaction(async (tx) => {
      const updated = await organizationRepository.update(
        data.organizationId,
        data.organizationId,
        { name: data.name },
        tx
      );

      if (!updated) {
        throw new Error("組織が見つかりません");
      }

      await recordAudit(
        {
          action: "organization.update",
          targetType: "organization",
          targetId: data.organizationId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { name: data.name },
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    // 例外詳細（DB エラー文等）はクライアントに返さず、サーバー側にのみ記録する
    console.error("updateOrganization failed", err);
    return { ok: false, reason: "組織の更新に失敗しました" };
  }
}
