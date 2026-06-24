"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { approvalPolicyRepository } from "@/infrastructure/repositories";
import { canPerform } from "@/domain/authorization";
import type { ConditionOperator } from "@/domain/models/approvalPolicy";

const CONDITION_OPERATORS = ["gt", "gte", "lt", "lte", "eq", "neq", "in"] as const;

const policySchema = z
  .object({
    name: z.string().min(1, "ポリシー名は必須です"),
    description: z.string().optional(),
    triggerAction: z.string().min(1, "トリガーアクションは必須です"),
    conditionField: z.string().optional(),
    conditionOperator: z.enum(CONDITION_OPERATORS).optional(),
    conditionValue: z.string().optional(),
    templateId: z.string().min(1, "テンプレートは必須です"),
  })
  .superRefine((data, ctx) => {
    const hasField = data.conditionField && data.conditionField.trim() !== "";
    if (hasField) {
      if (!data.conditionOperator) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionOperator"],
          message: "条件フィールドが設定されている場合、演算子は必須です",
        });
      }
      if (!data.conditionValue || data.conditionValue.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionValue"],
          message: "条件フィールドが設定されている場合、条件値は必須です",
        });
      }
    }
  });

export async function listPoliciesAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (!canPerform(session.user.role, "approvalSettings", "listPolicies")) {
    return { success: false as const, message: "この操作を実行する権限がありません" };
  }

  const policies = await approvalPolicyRepository.findByOrganization(
    session.user.organizationId
  );
  return { success: true as const, policies };
}

export async function createPolicyAction(_prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (!canPerform(session.user.role, "approvalSettings", "createPolicy")) {
    return { success: false as const, message: "この操作を実行する権限がありません" };
  }

  const conditionFieldRaw = formData.get("conditionField") as string | null;
  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    triggerAction: formData.get("triggerAction") as string,
    conditionField: conditionFieldRaw || undefined,
    conditionOperator: (formData.get("conditionOperator") as string) || undefined,
    conditionValue: (formData.get("conditionValue") as string) || undefined,
    templateId: formData.get("templateId") as string,
  };

  const validation = policySchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false as const,
      message:
        errors.formErrors[0] ??
        Object.values(errors.fieldErrors).flat()[0] ??
        "入力値が不正です",
    };
  }

  const data = validation.data;
  const hasCondition = data.conditionField && data.conditionField.trim() !== "";

  const policy = await approvalPolicyRepository.create({
    organizationId: session.user.organizationId,
    name: data.name,
    description: data.description ?? null,
    triggerAction: data.triggerAction,
    conditionField: hasCondition ? (data.conditionField ?? null) : null,
    conditionOperator: hasCondition ? (data.conditionOperator as ConditionOperator) : null,
    conditionValue: hasCondition ? (data.conditionValue ?? null) : null,
    templateId: data.templateId,
  });

  revalidatePath("/settings/policies");
  return { success: true as const, policy };
}

export async function updatePolicyAction(_prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (!canPerform(session.user.role, "approvalSettings", "editPolicy")) {
    return { success: false as const, message: "この操作を実行する権限がありません" };
  }

  const id = formData.get("id") as string;
  if (!id) return { success: false as const, message: "ポリシー ID が必要です" };

  const conditionFieldRaw = formData.get("conditionField") as string | null;
  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    triggerAction: formData.get("triggerAction") as string,
    conditionField: conditionFieldRaw || undefined,
    conditionOperator: (formData.get("conditionOperator") as string) || undefined,
    conditionValue: (formData.get("conditionValue") as string) || undefined,
    templateId: formData.get("templateId") as string,
  };

  const validation = policySchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false as const,
      message:
        errors.formErrors[0] ??
        Object.values(errors.fieldErrors).flat()[0] ??
        "入力値が不正です",
    };
  }

  const data = validation.data;
  const hasCondition = data.conditionField && data.conditionField.trim() !== "";

  const policy = await approvalPolicyRepository.updateById(
    id,
    session.user.organizationId,
    {
      name: data.name,
      description: data.description ?? null,
      triggerAction: data.triggerAction,
      conditionField: hasCondition ? (data.conditionField ?? null) : null,
      conditionOperator: hasCondition ? (data.conditionOperator as ConditionOperator) : null,
      conditionValue: hasCondition ? (data.conditionValue ?? null) : null,
      templateId: data.templateId,
    }
  );

  revalidatePath("/settings/policies");
  return { success: true as const, policy };
}

export async function togglePolicyAction(policyId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (!canPerform(session.user.role, "approvalSettings", "editPolicy")) {
    return { success: false as const, message: "この操作を実行する権限がありません" };
  }

  const current = await approvalPolicyRepository.findById(
    policyId,
    session.user.organizationId
  );
  if (!current) return { success: false as const, message: "ポリシーが見つかりません" };

  await approvalPolicyRepository.updateById(policyId, session.user.organizationId, {
    isActive: !current.isActive,
  });

  revalidatePath("/settings/policies");
  return { success: true as const };
}
