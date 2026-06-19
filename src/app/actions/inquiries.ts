"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createInquiry, updateInquiryStatus, listInquiries } from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import type { InquiryWithClient } from "@/domain/models/inquiry";
import type { ActionResult } from "./requests";

const createInquirySchema = z.object({
  clientId: z.string().uuid("顧客を選択してください"),
  contactId: z.string().uuid().optional(),
  title: z.string().min(1, "件名は必須です"),
  description: z.string().optional(),
  source: z.enum(["web", "phone", "referral", "exhibition", "other"]),
  assigneeId: z.string().uuid().optional(),
});

export type CreateInquiryState = {
  errors?: {
    clientId?: string[];
    contactId?: string[];
    title?: string[];
    description?: string[];
    source?: string[];
    assigneeId?: string[];
  };
  message?: string;
};

export async function createInquiryAction(
  prevState: CreateInquiryState,
  formData: FormData
): Promise<CreateInquiryState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  const rateCheck = await checkRateLimit({
    key: `createInquiry:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const contactIdRaw = formData.get("contactId");
  const assigneeIdRaw = formData.get("assigneeId");

  const parsed = createInquirySchema.safeParse({
    clientId: formData.get("clientId"),
    contactId: contactIdRaw && contactIdRaw !== "" ? contactIdRaw : undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    source: formData.get("source"),
    assigneeId: assigneeIdRaw && assigneeIdRaw !== "" ? assigneeIdRaw : undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createInquiry({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    clientId: parsed.data.clientId,
    contactId: parsed.data.contactId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    source: parsed.data.source,
    assigneeId: parsed.data.assigneeId ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/inquiries");
  return {};
}

export async function updateInquiryStatusAction(
  inquiryId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const newStatus = formData.get("newStatus");
  const templateId = formData.get("templateId");

  if (typeof newStatus !== "string") {
    return { success: false, message: "ステータスが指定されていません" };
  }

  // converted への遷移は admin と manager のみ
  if (newStatus === "converted") {
    if (session.user.role !== "admin" && session.user.role !== "manager") {
      return { success: false, message: "権限がありません" };
    }
  }

  const result = await updateInquiryStatus({
    inquiryId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newStatus: newStatus as "new" | "in_progress" | "converted" | "declined",
    templateId: typeof templateId === "string" && templateId !== "" ? templateId : undefined,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${inquiryId}`);
  return { success: true };
}

export async function listInquiriesAction(): Promise<{
  success: boolean;
  inquiries?: InquiryWithClient[];
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const inquiries = await listInquiries(session.user.organizationId);
  return { success: true, inquiries };
}
