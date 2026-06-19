import {
  inquiryRepository,
  auditLogRepository,
  approvalTemplateRepository,
  requestRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { canTransition, filterStepsByCondition } from "@/domain/services";
import type { Inquiry, InquiryStatus } from "@/domain/models/inquiry";

export type UpdateInquiryStatusResult =
  | { ok: true; inquiry: Inquiry }
  | { ok: false; reason: string };

export async function updateInquiryStatus(data: {
  inquiryId: string;
  organizationId: string;
  actorId: string;
  newStatus: InquiryStatus;
  templateId?: string;
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

  // 商談化への遷移
  if (data.newStatus === "converted") {
    if (!data.templateId) {
      return { ok: false, reason: "商談化にはテンプレートの指定が必要です" };
    }

    const template = await approvalTemplateRepository.findById(data.templateId, data.organizationId);
    if (!template) {
      return { ok: false, reason: "テンプレートが見つかりません" };
    }

    // 条件付きステップのフィルタリング（引き合いには formData がないため空オブジェクト）
    const filteredSteps = filterStepsByCondition(template.steps, {});

    try {
      const updatedInquiry = await db.transaction(async (tx) => {
        const now = new Date();

        const newRequest = await requestRepository.create(
          {
            title: `商談化承認: ${inquiry.title}`,
            formData: {},
            templateId: data.templateId,
            organizationId: data.organizationId,
            creatorId: data.actorId,
          },
          tx
        );

        await approvalStepRepository.createMany(
          filteredSteps.map((s) => ({
            requestId: newRequest.id,
            stepOrder: s.stepOrder,
            approverRole: s.approverRole,
            organizationId: data.organizationId,
            deadline:
              s.deadlineHours != null
                ? new Date(now.getTime() + s.deadlineHours * 60 * 60 * 1000)
                : null,
          })),
          tx
        );

        const updated = await inquiryRepository.updateStatus(
          data.inquiryId,
          data.organizationId,
          data.newStatus,
          newRequest.id,
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
              requestId: newRequest.id,
            },
          },
          tx
        );

        await auditLogRepository.create(
          {
            action: "request.create",
            targetType: "request",
            targetId: newRequest.id,
            actorId: data.actorId,
            organizationId: data.organizationId,
            metadata: {
              templateId: template.id,
              templateName: template.name,
              inquiryId: data.inquiryId,
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
        null,
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
