"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { approvalTemplateRepository } from "@/infrastructure/repositories";
import { createTemplate, updateTemplate, deleteTemplate } from "@/application/usecases";

const templateFieldSchema = z
  .object({
    name: z.string().min(1, "フィールド名は必須です"),
    label: z.string().min(1, "ラベルは必須です"),
    type: z.enum(["text", "number", "date", "textarea", "select"]),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "select") {
        return data.options !== undefined && data.options.length > 0;
      }
      return true;
    },
    { message: "selectタイプのフィールドにはoptionsが必須です" }
  );

const templateStepSchema = z.object({
  approverRole: z.enum(["admin", "member", "manager", "finance"]),
  deadlineHours: z.number().int().positive().optional(),
  condition: z
    .object({
      field: z.string(),
      operator: z.enum(["gt", "gte", "lt", "lte", "eq"]),
      value: z.number(),
    })
    .optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "テンプレート名は必須です"),
  steps: z
    .array(templateStepSchema)
    .min(1, "ステップを1つ以上追加してください"),
  fields: z.array(templateFieldSchema).default([]),
});

export async function listTemplatesAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false as const, message: "権限がありません" };

  const templates = await approvalTemplateRepository.findByOrganization(
    session.user.organizationId
  );

  return { success: true as const, templates };
}

export async function createTemplateAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false as const, message: "権限がありません" };

  const rawSteps = formData.get("steps");
  let parsedSteps: unknown;
  try {
    parsedSteps = rawSteps ? JSON.parse(rawSteps as string) : [];
  } catch {
    return { success: false as const, message: "ステップのJSON形式が不正です" };
  }

  const rawFields = formData.get("fields");
  let parsedFields: unknown;
  try {
    parsedFields = rawFields ? JSON.parse(rawFields as string) : [];
  } catch {
    return { success: false as const, message: "フィールドのJSON形式が不正です" };
  }

  const rawData = {
    name: formData.get("name") as string,
    steps: parsedSteps,
    fields: parsedFields,
  };

  const validation = templateSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false as const,
      message: errors.formErrors[0] ?? Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
      fieldErrors: errors.fieldErrors,
    };
  }

  const data = validation.data;
  const stepsWithOrder = data.steps.map((step, index) => ({
    stepOrder: index + 1,
    approverRole: step.approverRole,
    deadlineHours: step.deadlineHours,
    condition: step.condition,
  }));

  const result = await createTemplate({
    name: data.name,
    steps: stepsWithOrder,
    fields: data.fields,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false as const, message: result.reason };
  }

  revalidatePath("/settings/templates");
  return { success: true as const, template: result.template };
}

export async function updateTemplateAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false as const, message: "権限がありません" };

  const id = formData.get("id") as string;
  if (!id) return { success: false as const, message: "テンプレート ID が必要です" };

  const rawSteps = formData.get("steps");
  let parsedSteps: unknown;
  try {
    parsedSteps = rawSteps ? JSON.parse(rawSteps as string) : [];
  } catch {
    return { success: false as const, message: "ステップのJSON形式が不正です" };
  }

  const rawFields = formData.get("fields");
  let parsedFields: unknown;
  try {
    parsedFields = rawFields ? JSON.parse(rawFields as string) : [];
  } catch {
    return { success: false as const, message: "フィールドのJSON形式が不正です" };
  }

  const rawData = {
    name: formData.get("name") as string,
    steps: parsedSteps,
    fields: parsedFields,
  };

  const validation = templateSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false as const,
      message: errors.formErrors[0] ?? Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
      fieldErrors: errors.fieldErrors,
    };
  }

  const data = validation.data;
  const stepsWithOrder = data.steps.map((step, index) => ({
    stepOrder: index + 1,
    approverRole: step.approverRole,
    deadlineHours: step.deadlineHours,
    condition: step.condition,
  }));

  const result = await updateTemplate({
    id,
    name: data.name,
    steps: stepsWithOrder,
    fields: data.fields,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false as const, message: result.reason };
  }

  revalidatePath("/settings/templates");
  return { success: true as const, template: result.template };
}

export async function deleteTemplateAction(templateId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false as const, message: "権限がありません" };

  const result = await deleteTemplate({
    id: templateId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false as const, message: result.reason };
  }

  revalidatePath("/settings/templates");
  return { success: true as const };
}
