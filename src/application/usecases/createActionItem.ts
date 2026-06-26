import {
  actionItemRepository,
  dealRepository,
  meetingRepository,
  inquiryRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { ActionItem } from "@/domain/models/actionItem";

export type CreateActionItemResult =
  | { ok: true; actionItem: ActionItem }
  | { ok: false; reason: string };

export async function createActionItem(data: {
  organizationId: string;
  actorId: string;
  description: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  meetingId?: string | null;
  dealId?: string | null;
  inquiryId?: string | null;
}): Promise<CreateActionItemResult> {
  // 紐づけ先エンティティの存在確認と organizationId 一致検証
  if (data.dealId) {
    const deal = await dealRepository.findById(data.dealId, data.organizationId);
    if (!deal) {
      return { ok: false, reason: "案件が見つかりません" };
    }
  }

  if (data.meetingId) {
    const meeting = await meetingRepository.findById(data.meetingId, data.organizationId);
    if (!meeting) {
      return { ok: false, reason: "商談が見つかりません" };
    }
  }

  if (data.inquiryId) {
    const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
    if (!inquiry) {
      return { ok: false, reason: "引合が見つかりません" };
    }
  }

  try {
    const actionItem = await db.transaction(async (tx) => {
      const newActionItem = await actionItemRepository.create(
        {
          organizationId: data.organizationId,
          description: data.description,
          assigneeId: data.assigneeId ?? null,
          dueDate: data.dueDate ?? null,
          meetingId: data.meetingId ?? null,
          dealId: data.dealId ?? null,
          inquiryId: data.inquiryId ?? null,
          createdById: data.actorId,
        },
        tx
      );

      await auditLogRepository.create(
        {
          action: "action_item.create",
          targetType: "action_item",
          targetId: newActionItem.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newActionItem;
    });

    return { ok: true, actionItem };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "アクションアイテムの作成に失敗しました",
    };
  }
}
