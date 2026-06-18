"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { approvalTemplateRepository } from "@/infrastructure/repositories";
import { createTemplate, updateTemplate, deleteTemplate } from "@/application/usecases";

const templateStepSchema = z.object({
  approverRole: z.enum(["admin", "member", "manager", "finance"]),
  deadlineHours: z.number().int().positive().optional(),
});

const templateSchema = z
  .object({
    name: z.string().min(1, "テンプレート名は必須です"),
    steps: z
      .array(templateStepSchema)
      .min(1, "ステップを1つ以上追加してください"),
    minAmount: z.number().int().nonnegative().nullable().optional(),
    maxAmount: z.number().int().nonnegative().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.minAmount != null && data.maxAmount != null) {
        return data.minAmount <= data.maxAmount;
      }
      return true;
    },
    { message: "最小金額は最大金額以下である必要があります" }
  );

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

  const rawData = {
    name: formData.get("name") as string,
    steps: parsedSteps,
    minAmount: formData.get("minAmount")
      ? parseInt(formData.get("minAmount") as string, 10)
      : null,
    maxAmount: formData.get("maxAmount")
      ? parseInt(formData.get("maxAmount") as string, 10)
      : null,
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
  }));

  const result = await createTemplate({
    name: data.name,
    steps: stepsWithOrder,
    minAmount: data.minAmount ?? null,
    maxAmount: data.maxAmount ?? null,
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

  const rawData = {
    name: formData.get("name") as string,
    steps: parsedSteps,
    minAmount: formData.get("minAmount")
      ? parseInt(formData.get("minAmount") as string, 10)
      : null,
    maxAmount: formData.get("maxAmount")
      ? parseInt(formData.get("maxAmount") as string, 10)
      : null,
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
  }));

  const result = await updateTemplate({
    id,
    name: data.name,
    steps: stepsWithOrder,
    minAmount: data.minAmount ?? null,
    maxAmount: data.maxAmount ?? null,
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
