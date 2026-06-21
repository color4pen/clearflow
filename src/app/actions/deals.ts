"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createDeal, listDeals, updateDealPhase, updateDeal } from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import type { DealWithInquiry, ContractType } from "@/domain/models/deal";
import type { DealPhase } from "@/domain/models/deal";
import type { ActionResult } from "./requests";

const createDealSchema = z.object({
  inquiryId: z.string().uuid("引き合いを選択してください"),
  title: z.string().min(1, "案件名は必須です"),
  estimatedAmount: z.coerce.number().int().optional(),
  estimatedStartDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  contractType: z.enum(["quasi_delegation", "fixed_price", "ses"]).optional(),
  assigneeId: z.string().uuid().optional(),
  technicalLeadId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  estimatedAmount: z.coerce.number().int().optional().nullable(),
  estimatedStartDate: z.string().optional().nullable(),
  estimatedEndDate: z.string().optional().nullable(),
  contractType: z.enum(["quasi_delegation", "fixed_price", "ses"]).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  technicalLeadId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateDealState = {
  errors?: {
    inquiryId?: string[];
    title?: string[];
    estimatedAmount?: string[];
    estimatedStartDate?: string[];
    estimatedEndDate?: string[];
    contractType?: string[];
    assigneeId?: string[];
    technicalLeadId?: string[];
    notes?: string[];
  };
  message?: string;
};

export async function createDealAction(
  prevState: CreateDealState,
  formData: FormData
): Promise<CreateDealState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { message: "権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `createDeal:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const assigneeIdRaw = formData.get("assigneeId");
  const technicalLeadIdRaw = formData.get("technicalLeadId");
  const contractTypeRaw = formData.get("contractType");
  const estimatedAmountRaw = formData.get("estimatedAmount");

  const parsed = createDealSchema.safeParse({
    inquiryId: formData.get("inquiryId"),
    title: formData.get("title"),
    estimatedAmount:
      estimatedAmountRaw && estimatedAmountRaw !== "" ? estimatedAmountRaw : undefined,
    estimatedStartDate: formData.get("estimatedStartDate") || undefined,
    estimatedEndDate: formData.get("estimatedEndDate") || undefined,
    contractType:
      contractTypeRaw && contractTypeRaw !== "" ? contractTypeRaw : undefined,
    assigneeId: assigneeIdRaw && assigneeIdRaw !== "" ? assigneeIdRaw : undefined,
    technicalLeadId:
      technicalLeadIdRaw && technicalLeadIdRaw !== "" ? technicalLeadIdRaw : undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const inquiryId = parsed.data.inquiryId;

  const result = await createDeal({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    inquiryId,
    title: parsed.data.title,
    estimatedAmount: parsed.data.estimatedAmount ?? null,
    estimatedStartDate: parsed.data.estimatedStartDate
      ? new Date(parsed.data.estimatedStartDate)
      : null,
    estimatedEndDate: parsed.data.estimatedEndDate
      ? new Date(parsed.data.estimatedEndDate)
      : null,
    contractType: (parsed.data.contractType as ContractType) ?? null,
    assigneeId: parsed.data.assigneeId ?? null,
    technicalLeadId: parsed.data.technicalLeadId ?? null,
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/deals");
  revalidatePath(`/inquiries/${inquiryId}`);
  return {};
}

export async function updateDealPhaseAction(
  dealId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
  }

  const newPhase = formData.get("newPhase");
  const templateId = formData.get("templateId");

  if (typeof newPhase !== "string") {
    return { success: false, message: "フェーズが指定されていません" };
  }

  const result = await updateDealPhase({
    dealId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newPhase: newPhase as DealPhase,
    templateId:
      typeof templateId === "string" && templateId !== "" ? templateId : undefined,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function updateDealAction(
  dealId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
  }

  const contractTypeRaw = formData.get("contractType");
  const estimatedAmountRaw = formData.get("estimatedAmount");
  const assigneeIdRaw = formData.get("assigneeId");
  const technicalLeadIdRaw = formData.get("technicalLeadId");

  const parsed = updateDealSchema.safeParse({
    title: formData.get("title") || undefined,
    estimatedAmount:
      estimatedAmountRaw && estimatedAmountRaw !== "" ? estimatedAmountRaw : null,
    estimatedStartDate: formData.get("estimatedStartDate") || null,
    estimatedEndDate: formData.get("estimatedEndDate") || null,
    contractType:
      contractTypeRaw && contractTypeRaw !== "" ? contractTypeRaw : null,
    assigneeId: assigneeIdRaw && assigneeIdRaw !== "" ? assigneeIdRaw : null,
    technicalLeadId:
      technicalLeadIdRaw && technicalLeadIdRaw !== "" ? technicalLeadIdRaw : null,
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await updateDeal({
    dealId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    title: parsed.data.title,
    estimatedAmount: parsed.data.estimatedAmount ?? null,
    estimatedStartDate: parsed.data.estimatedStartDate
      ? new Date(parsed.data.estimatedStartDate)
      : null,
    estimatedEndDate: parsed.data.estimatedEndDate
      ? new Date(parsed.data.estimatedEndDate)
      : null,
    contractType: (parsed.data.contractType as ContractType | null) ?? null,
    assigneeId: parsed.data.assigneeId ?? null,
    technicalLeadId: parsed.data.technicalLeadId ?? null,
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function listDealsAction(): Promise<{
  success: boolean;
  deals?: DealWithInquiry[];
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const deals = await listDeals(session.user.organizationId);
  return { success: true, deals };
}
