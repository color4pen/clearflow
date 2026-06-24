"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  setRevenueTarget,
  updateRevenueTarget,
  deleteRevenueTarget,
} from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { canPerform } from "@/domain/authorization";

type ActionResult = { success: boolean; message?: string };

const setRevenueTargetSchema = z.object({
  periodStart: z.string().min(1, "開始日は必須です"),
  periodEnd: z.string().min(1, "終了日は必須です"),
  targetAmount: z.coerce
    .number()
    .int("目標金額は整数で入力してください")
    .positive("目標金額は1以上の値を入力してください"),
});

const updateRevenueTargetSchema = z.object({
  id: z.string().uuid("有効なIDが必要です"),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  targetAmount: z.coerce
    .number()
    .int("目標金額は整数で入力してください")
    .positive("目標金額は1以上の値を入力してください")
    .optional(),
});

export async function setRevenueTargetAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "revenue", "setTarget")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `setRevenueTarget:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const parsed = setRevenueTargetSchema.safeParse({
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    targetAmount: formData.get("targetAmount"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await setRevenueTarget({
    organizationId: session.user.organizationId,
    periodStart: new Date(parsed.data.periodStart),
    periodEnd: new Date(parsed.data.periodEnd),
    targetAmount: parsed.data.targetAmount,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/revenue/forecast");
  return { success: true };
}

export async function updateRevenueTargetAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "revenue", "setTarget")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `updateRevenueTarget:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const periodStartRaw = formData.get("periodStart");
  const periodEndRaw = formData.get("periodEnd");
  const targetAmountRaw = formData.get("targetAmount");

  const parsed = updateRevenueTargetSchema.safeParse({
    id: formData.get("id"),
    periodStart: periodStartRaw || undefined,
    periodEnd: periodEndRaw || undefined,
    targetAmount: targetAmountRaw || undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await updateRevenueTarget({
    id: parsed.data.id,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    periodStart: parsed.data.periodStart ? new Date(parsed.data.periodStart) : undefined,
    periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : undefined,
    targetAmount: parsed.data.targetAmount,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/revenue/forecast");
  return { success: true };
}

export async function deleteRevenueTargetAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "revenue", "setTarget")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const result = await deleteRevenueTarget({
    id,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/revenue/forecast");
  return { success: true };
}
