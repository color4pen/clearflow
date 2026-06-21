"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { addDealContact, removeDealContact } from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import type { ActionResult } from "./requests";

const addDealContactSchema = z.object({
  contactId: z.string().uuid("担当者を選択してください"),
  role: z.enum(["key_person", "decision_maker", "technical", "other"]),
});

const removeDealContactSchema = z.object({
  contactId: z.string().uuid("担当者IDが不正です"),
});

export async function addDealContactAction(
  dealId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const rateCheck = await checkRateLimit({
    key: `addDealContact:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const parsed = addDealContactSchema.safeParse({
    contactId: formData.get("contactId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "入力値が不正です",
    };
  }

  const result = await addDealContact({
    dealId,
    contactId: parsed.data.contactId,
    role: parsed.data.role,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function removeDealContactAction(
  dealId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const rateCheck = await checkRateLimit({
    key: `removeDealContact:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const parsed = removeDealContactSchema.safeParse({
    contactId: formData.get("contactId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "入力値が不正です",
    };
  }

  const result = await removeDealContact({
    dealId,
    contactId: parsed.data.contactId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}
