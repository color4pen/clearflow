import {
  approvalPolicyRepository,
  approvalTemplateRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { ApprovalPolicy, ConditionOperator } from "@/domain/models/approvalPolicy";

export type UpdatePolicyResult =
  | { ok: true; policy: ApprovalPolicy }
  | { ok: false; reason: string };

export async function updatePolicy(data: {
  id: string;
  organizationId: string;
  actorId: string;
  name: string;
  description?: string | null;
  triggerAction: string;
  conditionField?: string | null;
  conditionOperator?: ConditionOperator | null;
  conditionValue?: string | null;
  templateId: string;
}): Promise<UpdatePolicyResult> {
  // Validate that the template belongs to this organization (cross-tenant guard)
  const template = await approvalTemplateRepository.findById(
    data.templateId,
    data.organizationId
  );
  if (!template) {
    return { ok: false, reason: "指定されたテンプレートが見つかりません" };
  }

  try {
    const policy = await db.transaction(async (tx) => {
      const p = await approvalPolicyRepository.updateById(
        data.id,
        data.organizationId,
        {
          name: data.name,
          description: data.description ?? null,
          triggerAction: data.triggerAction,
          conditionField: data.conditionField ?? null,
          conditionOperator: data.conditionOperator ?? null,
          conditionValue: data.conditionValue ?? null,
          templateId: data.templateId,
        },
        tx
      );

      if (!p) return null;

      await recordAudit(
        {
          action: "policy.update",
          targetType: "approvalPolicy",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { name: data.name, triggerAction: data.triggerAction },
        },
        tx
      );

      return p;
    });

    if (!policy) {
      return { ok: false, reason: "ポリシーが見つかりません" };
    }

    return { ok: true, policy };
  } catch (err) {
    // 例外詳細（DB エラー文等）はクライアントに返さず、サーバー側にのみ記録する
    console.error("updatePolicy failed", err);
    return { ok: false, reason: "ポリシーの更新に失敗しました" };
  }
}
