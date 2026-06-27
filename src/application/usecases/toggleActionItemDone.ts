import { actionItemRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { ActionItem } from "@/domain/models/actionItem";

export type ToggleActionItemDoneResult =
  | { ok: true; actionItem: ActionItem }
  | { ok: false; reason: string };

export async function toggleActionItemDone(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<ToggleActionItemDoneResult> {
  const existing = await actionItemRepository.findById(data.id, data.organizationId);
  if (!existing) {
    return { ok: false, reason: "アクションアイテムが見つかりません" };
  }

  try {
    const actionItem = await db.transaction(async (tx) => {
      const updated = await actionItemRepository.update(
        data.id,
        data.organizationId,
        { done: !existing.done },
        existing.version,
        tx
      );
      if (!updated) return null;

      await recordAudit(
        {
          action: "action_item.toggle",
          targetType: "action_item",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { done: !existing.done },
        },
        tx
      );

      return updated;
    });

    if (!actionItem) {
      return { ok: false, reason: "このアクションアイテムは他のユーザーによって更新されました。画面を更新してください" };
    }
    return { ok: true, actionItem };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "アクションアイテムのトグルに失敗しました",
    };
  }
}
