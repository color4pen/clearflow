"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  createContract,
  updateContract,
  updateContractStatus,
  listContracts,
  getContract,
} from "@/application/usecases";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import type { ContractWithClient, Contract, ContractStatus } from "@/domain/models/contract";
import type { ActionResult } from "./requests";

const createContractSchema = z.object({
  dealId: z.string().uuid("有効な案件IDが必要です"),
  title: z.string().optional(),
  contractType: z.enum(["quasi_delegation", "fixed_price", "ses"]).optional(),
  amount: z.coerce.number().int().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  renewalType: z.enum(["one_time", "recurring"]).optional(),
  renewalCycle: z.string().optional(),
});

const updateContractSchema = z.object({
  title: z.string().min(1).optional(),
  contractType: z.enum(["quasi_delegation", "fixed_price", "ses"]).optional().nullable(),
  amount: z.coerce.number().int().nonnegative().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  renewalType: z.enum(["one_time", "recurring"]).optional(),
  renewalCycle: z.string().optional().nullable(),
});

export async function createContractAction(formData: FormData): Promise<ActionResult & { contractId?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
  }

  const rateCheck = await checkRateLimit({
    key: `createContract:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const contractTypeRaw = formData.get("contractType");
  const amountRaw = formData.get("amount");
  const renewalTypeRaw = formData.get("renewalType");

  const parsed = createContractSchema.safeParse({
    dealId: formData.get("dealId"),
    title: formData.get("title") || undefined,
    contractType: contractTypeRaw && contractTypeRaw !== "" ? contractTypeRaw : undefined,
    amount: amountRaw && amountRaw !== "" ? amountRaw : undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    paymentTerms: formData.get("paymentTerms") || undefined,
    renewalType: renewalTypeRaw && renewalTypeRaw !== "" ? renewalTypeRaw : undefined,
    renewalCycle: formData.get("renewalCycle") || undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await createContract({
    dealId: parsed.data.dealId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    title: parsed.data.title,
    contractType: parsed.data.contractType ?? null,
    amount: parsed.data.amount ?? null,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    paymentTerms: parsed.data.paymentTerms ?? null,
    renewalType: parsed.data.renewalType,
    renewalCycle: parsed.data.renewalCycle ?? null,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/contracts");
  revalidatePath(`/deals/${parsed.data.dealId}`);
  return { success: true, contractId: result.contract.id };
}

export async function updateContractAction(
  contractId: string,
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
  const amountRaw = formData.get("amount");
  const renewalTypeRaw = formData.get("renewalType");

  const parsed = updateContractSchema.safeParse({
    title: formData.get("title") || undefined,
    contractType: contractTypeRaw && contractTypeRaw !== "" ? contractTypeRaw : null,
    amount: amountRaw && amountRaw !== "" ? amountRaw : null,
    startDate: formData.get("startDate") || null,
    endDate: formData.get("endDate") || null,
    paymentTerms: formData.get("paymentTerms") || null,
    renewalType: renewalTypeRaw && renewalTypeRaw !== "" ? renewalTypeRaw : undefined,
    renewalCycle: formData.get("renewalCycle") || null,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, message: firstError?.message ?? "入力が無効です" };
  }

  const result = await updateContract({
    contractId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    title: parsed.data.title,
    contractType: parsed.data.contractType,
    amount: parsed.data.amount,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    paymentTerms: parsed.data.paymentTerms,
    renewalType: parsed.data.renewalType,
    renewalCycle: parsed.data.renewalCycle,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function updateContractStatusAction(
  contractId: string,
  newStatus: ContractStatus
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return { success: false, message: "権限がありません" };
  }

  const result = await updateContractStatus({
    contractId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newStatus,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  return { success: true };
}

export async function listContractsAction(): Promise<{
  success: boolean;
  contracts?: ContractWithClient[];
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const contracts = await listContracts(session.user.organizationId);
  return { success: true, contracts };
}

export async function getContractAction(contractId: string): Promise<{
  success: boolean;
  contract?: Contract;
  message?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const contract = await getContract({
    contractId,
    organizationId: session.user.organizationId,
  });

  if (!contract) {
    return { success: false, message: "契約が見つかりません" };
  }

  return { success: true, contract };
}
