"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  createInvoice,
  updateInvoiceStatus,
  listInvoicesByContract,
} from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import type { Invoice, InvoiceStatus } from "@/domain/models/invoice";
import type { ActionResult } from "./requests";

const createInvoiceSchema = z.object({
  contractId: z.string().uuid("有効な契約IDが必要です"),
  title: z.string().min(1, "タイトルは必須です").max(255, "タイトルは255文字以内で入力してください"),
  amount: z.coerce.number().int("金額は整数で入力してください").positive("金額は1以上の値を入力してください"),
  dueDate: z.string().optional(),
  issueDate: z.string().optional(),
  notes: z.string().max(1000, "備考は1000文字以内で入力してください").optional(),
});

const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().uuid("有効な請求IDが必要です"),
  newStatus: z.enum(["scheduled", "invoiced", "paid", "overdue"]),
});

export async function createInvoiceAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
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
  const dueDateRaw = formData.get("dueDate");
  const issueDateRaw = formData.get("issueDate");

  const parsed = createInvoiceSchema.safeParse({
    contractId: formData.get("contractId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    dueDate: dueDateRaw && dueDateRaw !== "" ? dueDateRaw : undefined,
    issueDate: issueDateRaw && issueDateRaw !== "" ? issueDateRaw : undefined,
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
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
    notes: parsed.data.notes ?? null,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/contracts/${parsed.data.contractId}`);
  return { success: true };
}

export async function updateInvoiceStatusAction(
  invoiceId: string,
  newStatus: string,
  contractId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
  }

  const parsed = updateInvoiceStatusSchema.safeParse({ invoiceId, newStatus });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await updateInvoiceStatus({
    invoiceId: parsed.data.invoiceId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newStatus: parsed.data.newStatus as InvoiceStatus,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/contracts/${contractId}`);
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
