import { actionItemRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";

export type DeleteActionItemResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deleteActionItem(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<DeleteActionItemResult> {
  const existing = await actionItemRepository.findById(data.id, data.organizationId);
  if (!existing) {
    return { ok: false, reason: "アクションアイテムが見つかりません" };
  }

  try {
    await db.transaction(async (tx) => {
      const deleted = await actionItemRepository.deleteById(data.id, data.organizationId, tx);
      if (!deleted) throw new Error("アクションアイテムの削除に失敗しました");

      await recordAudit(
        {
          action: "action_item.delete",
          targetType: "action_item",
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
      reason: err instanceof Error ? err.message : "アクションアイテムの削除に失敗しました",
    };
  }
}
