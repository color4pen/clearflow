import {
  approvalPolicyRepository,
  approvalTemplateRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { ApprovalPolicy, ConditionOperator } from "@/domain/models/approvalPolicy";

export type CreatePolicyResult =
  | { ok: true; policy: ApprovalPolicy }
  | { ok: false; reason: string };

export async function createPolicy(data: {
  organizationId: string;
  actorId: string;
  name: string;
  description?: string | null;
  triggerAction: string;
  conditionField?: string | null;
  conditionOperator?: ConditionOperator | null;
  conditionValue?: string | null;
  templateId: string;
}): Promise<CreatePolicyResult> {
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
      const p = await approvalPolicyRepository.create(
        {
          organizationId: data.organizationId,
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

      await recordAudit(
        {
          action: "policy.create",
          targetType: "approvalPolicy",
          targetId: p.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { name: data.name, triggerAction: data.triggerAction },
        },
        tx
      );

      return p;
    });

    return { ok: true, policy };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "ポリシーの作成に失敗しました",
    };
  }
}
