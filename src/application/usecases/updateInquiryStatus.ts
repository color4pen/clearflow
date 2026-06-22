import {
  inquiryRepository,
  auditLogRepository,
  dealRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { canTransition } from "@/domain/services";
import type { Inquiry, InquiryStatus } from "@/domain/models/inquiry";

export type UpdateInquiryStatusResult =
  | { ok: true; inquiry: Inquiry }
  | { ok: false; reason: string };

export async function updateInquiryStatus(data: {
  inquiryId: string;
  organizationId: string;
  actorId: string;
  newStatus: InquiryStatus;
}): Promise<UpdateInquiryStatusResult> {
  const inquiry = await inquiryRepository.findById(data.inquiryId, data.organizationId);
  if (!inquiry) {
    return { ok: false, reason: "引き合いが見つかりません" };
  }

  if (!canTransition(inquiry.status, data.newStatus)) {
    return {
      ok: false,
      reason: `ステータスを "${inquiry.status}" から "${data.newStatus}" に変更することはできません`,
    };
  }

  // 案件化への遷移: Deal を直接作成する
  if (data.newStatus === "converted") {
    if (!inquiry.clientId) {
      return { ok: false, reason: "案件化するには顧客の登録が必要です" };
    }

    try {
      const updatedInquiry = await db.transaction(async (tx) => {
        const deal = await dealRepository.create(
          {
            organizationId: data.organizationId,
            inquiryId: data.inquiryId,
            clientId: inquiry.clientId!,
            title: inquiry.title,
            notes: inquiry.description ?? null,
          },
          tx
        );

        const updated = await inquiryRepository.updateStatus(
          data.inquiryId,
          data.organizationId,
          data.newStatus,
          inquiry.version,
          tx
        );

        await auditLogRepository.create(
          {
            action: "inquiry.updateStatus",
            targetType: "inquiry",
            targetId: data.inquiryId,
            actorId: data.actorId,
            organizationId: data.organizationId,
            metadata: {
              fromStatus: inquiry.status,
              toStatus: data.newStatus,
              dealId: deal.id,
            },
          },
          tx
        );

        return updated;
      });

      if (!updatedInquiry) {
        return { ok: false, reason: "この引き合いは他のユーザーによって更新されました" };
      }
      return { ok: true, inquiry: updatedInquiry };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "ステータス更新に失敗しました",
      };
    }
  }

  // converted 以外の遷移
  try {
    const updatedInquiry = await db.transaction(async (tx) => {
      const updated = await inquiryRepository.updateStatus(
        data.inquiryId,
        data.organizationId,
        data.newStatus,
        inquiry.version,
        tx
      );

      await auditLogRepository.create(
        {
          action: "inquiry.updateStatus",
          targetType: "inquiry",
          targetId: data.inquiryId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: {
            fromStatus: inquiry.status,
            toStatus: data.newStatus,
          },
        },
        tx
      );

      return updated;
    });

    if (!updatedInquiry) {
      return { ok: false, reason: "この引き合いは他のユーザーによって更新されました" };
    }
    return { ok: true, inquiry: updatedInquiry };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "ステータス更新に失敗しました",
    };
  }
}
