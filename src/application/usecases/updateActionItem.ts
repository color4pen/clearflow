import {
  actionItemRepository,
  dealRepository,
  meetingRepository,
  inquiryRepository,
  userRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { ActionItem } from "@/domain/models/actionItem";

export type UpdateActionItemResult =
  | { ok: true; actionItem: ActionItem }
  | { ok: false; reason: string };

export async function updateActionItem(data: {
  id: string;
  organizationId: string;
  actorId: string;
  description?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  meetingId?: string | null;
  dealId?: string | null;
  inquiryId?: string | null;
}): Promise<UpdateActionItemResult> {
  const existing = await actionItemRepository.findById(data.id, data.organizationId);
  if (!existing) {
    return { ok: false, reason: "アクションアイテムが見つかりません" };
  }

  // 紐づけ先エンティティが変更される場合、新しい紐づけ先の存在確認 + organizationId 一致検証
  if (data.assigneeId !== undefined && data.assigneeId !== null && data.assigneeId !== existing.assigneeId) {
    const assignee = await userRepository.findById(data.assigneeId, data.organizationId);
    if (!assignee) {
      return { ok: false, reason: "担当者が見つかりません" };
    }
  }

  if (data.dealId !== undefined && data.dealId !== existing.dealId) {
    if (data.dealId !== null) {
      const deal = await dealRepository.findById(data.dealId, data.organizationId);
      if (!deal) {
        return { ok: false, reason: "案件が見つかりません" };
      }
    }
  }

  if (data.meetingId !== undefined && data.meetingId !== existing.meetingId) {
    if (data.meetingId !== null) {
      const meeting = await meetingRepository.findById(data.meetingId, data.organizationId);
      if (!meeting) {
        return { ok: false, reason: "商談が見つかりません" };
      }
    }
  }

  if (data.inquiryId !== undefined && data.inquiryId !== existing.inquiryId) {
    if (data.inquiryId !== null) {
      const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
      if (!inquiry) {
        return { ok: false, reason: "引合が見つかりません" };
      }
    }
  }

  const updateData: Partial<{
    description: string;
    assigneeId: string | null;
    dueDate: Date | null;
    meetingId: string | null;
    dealId: string | null;
    inquiryId: string | null;
  }> = {};

  if (data.description !== undefined) updateData.description = data.description;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.meetingId !== undefined) updateData.meetingId = data.meetingId;
  if (data.dealId !== undefined) updateData.dealId = data.dealId;
  if (data.inquiryId !== undefined) updateData.inquiryId = data.inquiryId;

  try {
    const actionItem = await db.transaction(async (tx) => {
      const updated = await actionItemRepository.update(
        data.id,
        data.organizationId,
        updateData,
        existing.version,
        tx
      );
      if (!updated) return null;

      await recordAudit(
        {
          action: "action_item.update",
          targetType: "action_item",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: updateData,
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
      reason: err instanceof Error ? err.message : "アクションアイテムの更新に失敗しました",
    };
  }
}
