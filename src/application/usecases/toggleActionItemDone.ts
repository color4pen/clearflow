import { actionItemRepository, auditLogRepository } from "@/infrastructure/repositories";
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
        tx
      );
      if (!updated) throw new Error("アクションアイテムの更新に失敗しました");

      await auditLogRepository.create(
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

    return { ok: true, actionItem };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "アクションアイテムのトグルに失敗しました",
    };
  }
}
