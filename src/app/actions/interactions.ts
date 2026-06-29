"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { createContractAdjustment, createInvoiceAdjustment } from "@/application/usecases";
import { canPerform } from "@/domain/authorization";

// ---------------------------------------------------------------------------
// 契約調整の記録
// ---------------------------------------------------------------------------

const recordContractAdjustmentSchema = z.object({
  contractId: z.string().uuid("契約IDが不正です"),
  summary: z.string().min(1, "要約は必須です"),
  date: z.string().optional(),
  details: z.string().optional(),
});

export type RecordContractAdjustmentState = {
  message?: string;
  errors?: {
    contractId?: string[];
    summary?: string[];
    date?: string[];
    details?: string[];
  };
};

export async function recordContractAdjustmentAction(
  prevState: RecordContractAdjustmentState,
  formData: FormData
): Promise<RecordContractAdjustmentState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "interaction", "recordContractAdjustment")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const parsed = recordContractAdjustmentSchema.safeParse({
    contractId: formData.get("contractId"),
    summary: formData.get("summary"),
    date: formData.get("date") || undefined,
    details: formData.get("details") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createContractAdjustment({
    contractId: parsed.data.contractId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    summary: parsed.data.summary,
    date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    details: parsed.data.details ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath(`/contracts/${parsed.data.contractId}`);
  return {};
}

// ---------------------------------------------------------------------------
// 請求調整の記録
// ---------------------------------------------------------------------------

const recordInvoiceAdjustmentSchema = z.object({
  invoiceId: z.string().uuid("請求IDが不正です"),
  contractId: z.string().uuid("契約IDが不正です"),
  summary: z.string().min(1, "要約は必須です"),
  date: z.string().optional(),
  details: z.string().optional(),
});

export type RecordInvoiceAdjustmentState = {
  message?: string;
  errors?: {
    invoiceId?: string[];
    contractId?: string[];
    summary?: string[];
    date?: string[];
    details?: string[];
  };
};

export async function recordInvoiceAdjustmentAction(
  prevState: RecordInvoiceAdjustmentState,
  formData: FormData
): Promise<RecordInvoiceAdjustmentState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  if (!canPerform(session.user.role, "interaction", "recordInvoiceAdjustment")) {
    return { message: "この操作を実行する権限がありません" };
  }

  const parsed = recordInvoiceAdjustmentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    contractId: formData.get("contractId"),
    summary: formData.get("summary"),
    date: formData.get("date") || undefined,
    details: formData.get("details") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createInvoiceAdjustment({
    invoiceId: parsed.data.invoiceId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    summary: parsed.data.summary,
    date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    details: parsed.data.details ?? null,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath(`/contracts/${parsed.data.contractId}/invoices/${parsed.data.invoiceId}`);
  revalidatePath(`/contracts/${parsed.data.contractId}`);
  return {};
}
