"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  listInvoicesByContract,
} from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { canPerform } from "@/domain/authorization";
import type { Invoice, InvoiceStatus } from "@/domain/models/invoice";
import type { ActionResult } from "./requests";

const createInvoiceSchema = z.object({
  contractId: z.string().uuid("有効な契約IDが必要です"),
  title: z.string().min(1, "タイトルは必須です").max(255, "タイトルは255文字以内で入力してください"),
  amount: z.coerce.number().int("金額は整数で入力してください").positive("金額は1以上の値を入力してください"),
  issueDate: z.string().optional(),
  dueDate: z.string().min(1, "支払期限は必須です"),
  notes: z.string().max(1000, "備考は1000文字以内で入力してください").optional(),
});

const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().uuid("有効な請求IDが必要です"),
  newStatus: z.enum(["scheduled", "invoiced", "paid", "overdue"]),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().refine(
    (val) => !val || val <= new Date().toISOString().slice(0, 10),
    { message: "入金日は本日以前の日付を指定してください" }
  ),
});

const updateInvoiceSchema = z.object({
  invoiceId: z.string().uuid("有効な請求IDが必要です"),
  title: z.string().min(1).optional(),
  amount: z.coerce.number().int().positive("金額は1以上の値を入力してください").optional(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function createInvoiceAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "invoice", "create")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `createInvoice:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const notesRaw = formData.get("notes");
  const issueDateRaw = formData.get("issueDate");

  const parsed = createInvoiceSchema.safeParse({
    contractId: formData.get("contractId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    issueDate: issueDateRaw && issueDateRaw !== "" ? issueDateRaw : undefined,
    dueDate: formData.get("dueDate"),
    notes: notesRaw && notesRaw !== "" ? String(notesRaw) : undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await createInvoice({
    contractId: parsed.data.contractId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    title: parsed.data.title,
    amount: parsed.data.amount,
    issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
    dueDate: new Date(parsed.data.dueDate),
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/contracts/${parsed.data.contractId}`);
  return { success: true };
}

export async function updateInvoiceAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `updateInvoice:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const amountRaw = formData.get("amount");
  const issueDateRaw = formData.get("issueDate");
  const dueDateRaw = formData.get("dueDate");
  const notesRaw = formData.get("notes");
  const contractId = formData.get("contractId");

  const parsed = updateInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    title: formData.get("title") || undefined,
    amount: amountRaw === null ? undefined : (amountRaw !== "" ? amountRaw : undefined),
    issueDate:
      issueDateRaw === null ? undefined :
        (issueDateRaw !== "" ? issueDateRaw : null),
    dueDate: dueDateRaw === null ? undefined : (dueDateRaw !== "" ? dueDateRaw : undefined),
    notes:
      notesRaw === null ? undefined :
        (notesRaw !== "" ? String(notesRaw) : null),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await updateInvoice({
    invoiceId: parsed.data.invoiceId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    title: parsed.data.title,
    amount: parsed.data.amount,
    issueDate:
      parsed.data.issueDate !== undefined
        ? (parsed.data.issueDate ? new Date(parsed.data.issueDate) : null)
        : undefined,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    notes: parsed.data.notes,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  if (contractId) {
    revalidatePath(`/contracts/${contractId}`);
  }
  return { success: true };
}

export async function updateInvoiceStatusAction(
  invoiceId: string,
  newStatus: string,
  contractId: string,
  paidAt?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "invoice", "changeStatus")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `updateInvoiceStatus:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const parsed = updateInvoiceStatusSchema.safeParse({ invoiceId, newStatus, paidAt });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await updateInvoiceStatus({
    invoiceId: parsed.data.invoiceId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newStatus: parsed.data.newStatus as InvoiceStatus,
    paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(`/contracts/${contractId}/invoices/${invoiceId}`);
  return { success: true };
}

export async function listInvoicesByContractAction(contractId: string): Promise<{
  success: boolean;
  invoices?: Invoice[];
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const invoices = await listInvoicesByContract({
    contractId,
    organizationId: session.user.organizationId,
  });
  return { success: true, invoices };
}
