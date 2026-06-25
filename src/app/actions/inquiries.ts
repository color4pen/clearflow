"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createInquiry, updateInquiryStatus, updateInquiry, listInquiries, createClient, deleteInquiry } from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { canPerform } from "@/domain/authorization";
import type { InquiryWithClient } from "@/domain/models/inquiry";
import type { ActionResult } from "./requests";

const createInquirySchema = z.object({
  clientId: z.string().uuid().optional(),
  newClientName: z.string().min(1).optional(),
  title: z.string().min(1, "件名は必須です"),
  description: z.string().optional(),
  contactNote: z.string().optional(),
  source: z.enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]),
  assigneeId: z.string().uuid().optional(),
  budget: z.coerce.number().int().optional(),
  timeline: z.string().optional(),
});

export type CreateInquiryState = {
  errors?: {
    clientId?: string[];
    newClientName?: string[];
    title?: string[];
    description?: string[];
    contactNote?: string[];
    source?: string[];
    assigneeId?: string[];
    budget?: string[];
    timeline?: string[];
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

  if (!canPerform(session.user.role, "inquiry", "create")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `createInquiry:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const clientIdRaw = formData.get("clientId");
  const assigneeIdRaw = formData.get("assigneeId");
  const newClientNameRaw = formData.get("newClientName");

  const parsed = createInquirySchema.safeParse({
    clientId: clientIdRaw && clientIdRaw !== "" && clientIdRaw !== "__new__" ? clientIdRaw : undefined,
    newClientName: newClientNameRaw && newClientNameRaw !== "" ? newClientNameRaw : undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    contactNote: formData.get("contactNote") || undefined,
    source: formData.get("source"),
    assigneeId: assigneeIdRaw && assigneeIdRaw !== "" ? assigneeIdRaw : undefined,
    budget: formData.get("budget") || undefined,
    timeline: formData.get("timeline") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // 新規顧客名が指定されており clientId が未指定の場合、顧客を先に作成する
  let resolvedClientId: string | null = parsed.data.clientId ?? null;
  if (parsed.data.newClientName && !parsed.data.clientId) {
    const clientResult = await createClient({
      name: parsed.data.newClientName,
      organizationId: session.user.organizationId,
      actorId: session.user.id,
    });
    if (!clientResult.ok) {
      return { message: clientResult.reason };
    }
    resolvedClientId = clientResult.client.id;
  }

  const result = await createInquiry({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    clientId: resolvedClientId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    contactNote: parsed.data.contactNote ?? null,
    source: parsed.data.source,
    assigneeId: parsed.data.assigneeId ?? null,
    budget: parsed.data.budget ?? null,
    timeline: parsed.data.timeline ?? null,
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

  if (typeof newStatus !== "string") {
    return { success: false, message: "ステータスが指定されていません" };
  }

  if (newStatus === "converted") {
    if (!canPerform(session.user.role, "inquiry", "convert")) {
      return { success: false, message: "この操作を実行する権限がありません" };
    }
  }

  if (newStatus === "declined") {
    if (!canPerform(session.user.role, "inquiry", "decline")) {
      return { success: false, message: "この操作を実行する権限がありません" };
    }
  }

  const result = await updateInquiryStatus({
    inquiryId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newStatus: newStatus as "new" | "converted" | "declined",
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${inquiryId}`);

  if (result.pendingApproval) {
    return {
      success: true,
      message: "承認リクエストを作成しました。承認後に案件が自動生成されます",
    };
  }

  return { success: true };
}

const updateInquirySchema = z.object({
  title: z.string().min(1, "件名は必須です"),
  description: z.string().optional(),
  contactNote: z.string().optional(),
  source: z.enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]),
  clientId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  budget: z.coerce.number().int().optional(),
  timeline: z.string().optional(),
});

export type UpdateInquiryState = {
  errors?: {
    title?: string[];
    description?: string[];
    contactNote?: string[];
    source?: string[];
    clientId?: string[];
    assigneeId?: string[];
    budget?: string[];
    timeline?: string[];
  };
  message?: string;
  success?: boolean;
};

export async function updateInquiryAction(
  inquiryId: string,
  _prevState: UpdateInquiryState,
  formData: FormData
): Promise<UpdateInquiryState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "inquiry", "edit")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const clientIdRaw = formData.get("clientId");
  const newClientName = formData.get("newClientName");

  let resolvedClientId = clientIdRaw && clientIdRaw !== "" && clientIdRaw !== "__new__"
    ? String(clientIdRaw)
    : undefined;

  if (!resolvedClientId && typeof newClientName === "string" && newClientName.trim()) {
    const { createClient } = await import("@/application/usecases");
    const clientResult = await createClient({
      name: newClientName.trim(),
      organizationId: session.user.organizationId,
      actorId: session.user.id,
    });
    if (!clientResult.ok) {
      return { message: clientResult.reason };
    }
    resolvedClientId = clientResult.client.id;
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    contactNote: formData.get("contactNote") || undefined,
    source: formData.get("source"),
    clientId: resolvedClientId,
    assigneeId: formData.get("assigneeId") || undefined,
    budget: formData.get("budget") || undefined,
    timeline: formData.get("timeline") || undefined,
  };

  const parsed = updateInquirySchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await updateInquiry({
    inquiryId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    contactNote: parsed.data.contactNote ?? null,
    source: parsed.data.source,
    clientId: parsed.data.clientId ?? null,
    assigneeId: parsed.data.assigneeId ?? null,
    budget: parsed.data.budget ?? null,
    timeline: parsed.data.timeline ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${inquiryId}`);
  return { success: true };
}

export async function deleteInquiryAction(inquiryId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "inquiry", "delete")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const result = await deleteInquiry({
    id: inquiryId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/inquiries");
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
