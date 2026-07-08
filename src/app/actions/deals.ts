"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createDeal, listDeals, updateDealPhase, updateDeal, deleteDeal } from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { canPerform } from "@/domain/authorization";
import type { DealWithDetails, ContractType } from "@/domain/models/deal";
import type { DealPhase } from "@/domain/models/deal";
import type { ActionResult } from "./requests";

const createDealSchema = z.object({
  inquiryId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  title: z.string().min(1, "案件名は必須です"),
  description: z.string().optional(),
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
  description: z.string().optional().nullable(),
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
    clientId?: string[];
    title?: string[];
    description?: string[];
    estimatedAmount?: string[];
    estimatedStartDate?: string[];
    estimatedEndDate?: string[];
    contractType?: string[];
    assigneeId?: string[];
    technicalLeadId?: string[];
    notes?: string[];
  };
  message?: string;
  dealId?: string;
};

export async function createDealAction(
  prevState: CreateDealState,
  formData: FormData
): Promise<CreateDealState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "deal", "create")) {
    return { message: "この操作を実行する権限がありません" };
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
  const inquiryIdRaw = formData.get("inquiryId");
  const clientIdRaw = formData.get("clientId");

  const parsed = createDealSchema.safeParse({
    inquiryId: inquiryIdRaw && inquiryIdRaw !== "" ? inquiryIdRaw : undefined,
    clientId: clientIdRaw && clientIdRaw !== "" && clientIdRaw !== "__new__" ? clientIdRaw : undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
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

  // 新規顧客の作成
  const newClientName = formData.get("newClientName");
  let resolvedClientId = parsed.data.clientId;
  if (!parsed.data.inquiryId && typeof newClientName === "string" && newClientName.trim() && (!resolvedClientId || resolvedClientId === "__new__")) {
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

  if (resolvedClientId === "__new__") {
    resolvedClientId = undefined;
  }

  // inquiryId も clientId もない場合はエラー
  if (!parsed.data.inquiryId && !resolvedClientId) {
    return { errors: { clientId: ["顧客または引き合いの指定が必要です"] } };
  }

  const result = await createDeal({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    inquiryId: parsed.data.inquiryId,
    clientId: resolvedClientId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
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
  if (parsed.data.inquiryId) {
    revalidatePath(`/inquiries/${parsed.data.inquiryId}`);
  }
  return { dealId: result.deal.id };
}

export async function updateDealPhaseAction(
  dealId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const newPhase = formData.get("newPhase");

  if (typeof newPhase !== "string") {
    return { success: false, message: "フェーズが指定されていません" };
  }

  const isTerminalPhase = newPhase === "won" || newPhase === "lost" || newPhase === "passed";
  const requiredOperation = isTerminalPhase ? "closePhase" : "changePhase";
  if (!canPerform(session.user.role, "deal", requiredOperation)) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const result = await updateDealPhase({
    dealId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newPhase: newPhase as DealPhase,
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

  if (!canPerform(session.user.role, "deal", "edit")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const contractTypeRaw = formData.get("contractType");
  const estimatedAmountRaw = formData.get("estimatedAmount");
  const assigneeIdRaw = formData.get("assigneeId");
  const technicalLeadIdRaw = formData.get("technicalLeadId");
  const estimatedStartDateRaw = formData.get("estimatedStartDate");
  const estimatedEndDateRaw = formData.get("estimatedEndDate");
  const notesRaw = formData.get("notes");
  const descriptionRaw = formData.get("description");

  // null means the field was not present in FormData (partial update from inline edit).
  // undefined means "don't change this field". Empty string means "clear this field".
  const parsed = updateDealSchema.safeParse({
    title: formData.get("title") || undefined,
    description:
      descriptionRaw === null ? undefined :
        (descriptionRaw || null),
    estimatedAmount:
      estimatedAmountRaw === null ? undefined :
        (estimatedAmountRaw !== "" ? estimatedAmountRaw : null),
    estimatedStartDate:
      estimatedStartDateRaw === null ? undefined :
        (estimatedStartDateRaw || null),
    estimatedEndDate:
      estimatedEndDateRaw === null ? undefined :
        (estimatedEndDateRaw || null),
    contractType:
      contractTypeRaw === null ? undefined :
        (contractTypeRaw !== "" ? contractTypeRaw : null),
    assigneeId:
      assigneeIdRaw === null ? undefined :
        (assigneeIdRaw !== "" ? assigneeIdRaw : null),
    technicalLeadId:
      technicalLeadIdRaw === null ? undefined :
        (technicalLeadIdRaw !== "" ? technicalLeadIdRaw : null),
    notes:
      notesRaw === null ? undefined :
        (notesRaw || null),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const phaseRaw = formData.get("phase");
  if (typeof phaseRaw === "string" && phaseRaw !== "") {
    const isTerminal = phaseRaw === "won" || phaseRaw === "lost" || phaseRaw === "passed";
    const phaseOperation = isTerminal ? "closePhase" : "changePhase";
    if (!canPerform(session.user.role, "deal", phaseOperation)) {
      return { success: false, message: "この操作を実行する権限がありません" };
    }
    const phaseResult = await updateDealPhase({
      dealId,
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      newPhase: phaseRaw as DealPhase,
    });
    if (!phaseResult.ok) {
      return { success: false, message: phaseResult.reason };
    }
  }

  const result = await updateDeal({
    dealId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
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

export async function deleteDealAction(dealId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "deal", "delete")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const result = await deleteDeal({
    id: dealId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/deals");
  return { success: true };
}

export async function listDealsAction(): Promise<{
  success: boolean;
  deals?: DealWithDetails[];
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const deals = await listDeals(session.user.organizationId);
  return { success: true, deals };
}
