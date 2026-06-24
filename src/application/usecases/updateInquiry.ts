import { inquiryRepository, auditLogRepository } from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Inquiry, InquirySource } from "@/domain/models/inquiry";

export type UpdateInquiryResult = { ok: true; inquiry: Inquiry } | { ok: false; reason: string };

export async function updateInquiry(data: {
  inquiryId: string;
  organizationId: string;
  actorId: string;
  title?: string;
  description?: string | null;
  source?: InquirySource;
  clientId?: string | null;
  budget?: number | null;
  timeline?: string | null;
  assigneeId?: string | null;
}): Promise<UpdateInquiryResult> {
  const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
  if (!inquiry) {
    return { ok: false, reason: "引き合いが見つかりません" };
  }

  // 変更されたフィールドのみ更新対象とする
  const updatePayload: Partial<{
    title: string;
    description: string | null;
    source: string;
    clientId: string | null;
    budget: number | null;
    timeline: string | null;
    assigneeId: string | null;
  }> = {};

  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.source !== undefined) updatePayload.source = data.source;
  if (data.clientId !== undefined) updatePayload.clientId = data.clientId;
  if (data.budget !== undefined) updatePayload.budget = data.budget;
  if (data.timeline !== undefined) updatePayload.timeline = data.timeline;
  if (data.assigneeId !== undefined) updatePayload.assigneeId = data.assigneeId;

  try {
    const updatedInquiry = await db.transaction(async (tx) => {
      const updated = await inquiryRepository.update(
        data.inquiryId,
        data.organizationId,
        updatePayload,
        tx
      );

      await auditLogRepository.create(
        {
          action: "inquiry.update",
          targetType: "inquiry",
          targetId: data.inquiryId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { updatedFields: Object.keys(updatePayload) },
        },
        tx
      );

      return updated;
    });

    if (!updatedInquiry) {
      return { ok: false, reason: "引き合いの更新に失敗しました" };
    }
    return { ok: true, inquiry: updatedInquiry };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "引き合いの更新に失敗しました",
    };
  }
}
