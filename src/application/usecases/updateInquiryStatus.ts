import {
  inquiryRepository,
  auditLogRepository,
  dealRepository,
  approvalTemplateRepository,
  approvalStepRepository,
  requestRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import { canTransition } from "@/domain/services";
import { dispatcher } from "@/domain/events";
import { evaluatePolicies } from "./evaluatePolicies";
import type { Inquiry, InquiryStatus } from "@/domain/models/inquiry";

export type UpdateInquiryStatusResult =
  | { ok: true; inquiry: Inquiry; pendingApproval?: { requestId: string } }
  | { ok: false; reason: string };

export async function updateInquiryStatus(
  data: {
    inquiryId: string;
    organizationId: string;
    actorId: string;
    newStatus: InquiryStatus;
  },
  options?: { skipPolicyCheck?: boolean }
): Promise<UpdateInquiryStatusResult> {
  return dispatcher.runInContext(async () => {
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

    // 案件化への遷移
    if (data.newStatus === "converted") {
      if (!inquiry.clientId) {
        return { ok: false, reason: "案件化するには顧客の登録が必要です" };
      }

      // ポリシー評価（skipPolicyCheck が true の場合はスキップ）
      if (!options?.skipPolicyCheck) {
        // 重複防止: 既存の pending system リクエストが存在しないか確認
        const existingRequest = await requestRepository.findByOriginTriggerEntity(
          data.organizationId,
          "inquiry.convert",
          data.inquiryId
        );
        if (existingRequest) {
          return { ok: false, reason: "承認待ちの申請があります" };
        }

        const context: Record<string, unknown> = {
          budget: inquiry.budget,
          source: inquiry.source,
          title: inquiry.title,
          clientId: inquiry.clientId,
        };

        const matchedPolicies = await evaluatePolicies(
          data.organizationId,
          "inquiry.convert",
          context
        );

        if (matchedPolicies.length > 0) {
          const policy = matchedPolicies[0];
          const template = await approvalTemplateRepository.findById(
            policy.templateId,
            data.organizationId
          );

          // テンプレートが見つからない場合は従来フローにフォールバック
          if (template) {
            try {
              const pendingRequestId = await db.transaction(async (tx) => {
                const newRequest = await requestRepository.create(
                  {
                    title: `承認: ${inquiry.title}`,
                    formData: {},
                    templateId: template.id,
                    organizationId: data.organizationId,
                    creatorId: data.actorId,
                    status: "pending",
                    originType: "system",
                    originPolicyId: policy.id,
                    originTriggerAction: "inquiry.convert",
                    originTriggerEntityId: data.inquiryId,
                  },
                  tx
                );

                // テンプレートのステップから承認ステップを生成
                if (template.steps.length > 0) {
                  await approvalStepRepository.createMany(
                    template.steps.map((step) => {
                      const deadline =
                        step.deadlineHours != null
                          ? new Date(Date.now() + step.deadlineHours * 60 * 60 * 1000)
                          : null;
                      return {
                        requestId: newRequest.id,
                        stepOrder: step.stepOrder,
                        approverRole: step.approverRole,
                        organizationId: data.organizationId,
                        deadline,
                      };
                    }),
                    tx
                  );
                }

                await auditLogRepository.create(
                  {
                    action: "request.create",
                    targetType: "request",
                    targetId: newRequest.id,
                    actorId: data.actorId,
                    organizationId: data.organizationId,
                    metadata: { originType: "system", policyId: policy.id },
                  },
                  tx
                );

                dispatcher.dispatch({
                  type: "request.submitted",
                  organizationId: data.organizationId,
                  actorId: data.actorId,
                  occurredAt: new Date(),
                  payload: {
                    requestId: newRequest.id,
                    requestTitle: newRequest.title,
                    status: "pending",
                  },
                });

                return newRequest.id;
              });

              dispatcher.flushAsync();
              return {
                ok: true,
                inquiry,
                pendingApproval: { requestId: pendingRequestId },
              };
            } catch (err) {
              return {
                ok: false,
                reason: err instanceof Error ? err.message : "承認リクエストの生成に失敗しました",
              };
            }
          }
          // テンプレートが見つからない場合は従来フローにフォールバック（fall through）
        }
      }

      // 従来フロー（ポリシー非合致、skipPolicyCheck=true、またはテンプレートなしのフォールバック）
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

          dispatcher.dispatch({
            type: "inquiry.converted",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              inquiryId: data.inquiryId,
              dealId: deal.id,
            },
          });

          return updated;
        });

        if (!updatedInquiry) {
          return { ok: false, reason: "この引き合いは他のユーザーによって更新されました" };
        }

        dispatcher.flushAsync();
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

        if (data.newStatus === "declined") {
          dispatcher.dispatch({
            type: "inquiry.declined",
            organizationId: data.organizationId,
            actorId: data.actorId,
            occurredAt: new Date(),
            payload: {
              inquiryId: data.inquiryId,
            },
          });
        }

        return updated;
      });

      if (!updatedInquiry) {
        return { ok: false, reason: "この引き合いは他のユーザーによって更新されました" };
      }

      dispatcher.flushAsync();
      return { ok: true, inquiry: updatedInquiry };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "ステータス更新に失敗しました",
      };
    }
  });
}
