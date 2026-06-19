"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  createRequest,
  submitRequest,
  approveRequest,
  rejectRequest,
  resubmitRequest,
  getApprovalSteps,
  bulkApprove,
} from "@/application/usecases";
import { approvalTemplateRepository } from "@/infrastructure/repositories";
import { idempotencyKeyRepository } from "@/infrastructure/repositories";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";

const createRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  templateId: z.string().uuid("テンプレートを選択してください"),
});

export type CreateRequestState = {
  errors?: {
    title?: string[];
    templateId?: string[];
    formData?: Record<string, string[]>;
  };
  message?: string;
};

export type ActionResult = { success: boolean; message?: string };

/** UUID v4 format regex (36 chars: 8-4-4-4-12 hex + hyphens). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true only if the value is a string that matches UUID v4 format.
 * This guards against arbitrary strings being persisted to idempotency_keys.key.
 */
function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export async function createRequestAction(
  prevState: CreateRequestState,
  formData: FormData
): Promise<CreateRequestState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  const rateCheck = await checkRateLimit({
    key: `createRequest:${session.user.id}`,
    limit: RATE_LIMITS.createRequest.limit,
    windowMs: RATE_LIMITS.createRequest.windowMs,
  });
  if (!rateCheck.allowed) {
    return { message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const parsed = createRequestSchema.safeParse({
    title: formData.get("title"),
    templateId: formData.get("templateId"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // Fetch the template to get field definitions
  const template = await approvalTemplateRepository.findById(
    parsed.data.templateId,
    session.user.organizationId
  );

  if (!template) {
    return { errors: { templateId: ["テンプレートが見つかりません"] } };
  }

  // Build and validate formData from template field definitions
  const builtFormData: Record<string, { value: unknown; label: string }> = {};
  const formErrors: Record<string, string[]> = {};

  for (const field of template.fields) {
    const rawValue = formData.get(`field_${field.name}`);
    const strValue = rawValue !== null ? String(rawValue).trim() : "";

    if (field.required && strValue === "") {
      formErrors[field.name] = [`${field.label}は必須です`];
      continue;
    }

    if (strValue === "") continue;

    if (field.type === "number") {
      const numValue = Number(strValue);
      if (!isFinite(numValue)) {
        formErrors[field.name] = [`${field.label}は数値を入力してください`];
        continue;
      }
      builtFormData[field.name] = { value: numValue, label: field.label };
    } else if (field.type === "select") {
      const options = field.options ?? [];
      if (!options.includes(strValue)) {
        formErrors[field.name] = [`${field.label}の値が不正です`];
        continue;
      }
      builtFormData[field.name] = { value: strValue, label: field.label };
    } else {
      builtFormData[field.name] = { value: strValue, label: field.label };
    }
  }

  if (Object.keys(formErrors).length > 0) {
    return { errors: { formData: formErrors } };
  }

  const result = await createRequest({
    title: parsed.data.title,
    templateId: parsed.data.templateId,
    formData: builtFormData,
    organizationId: session.user.organizationId,
    creatorId: session.user.id,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/requests");
  return {};
}

export async function listTemplatesForRequestAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };

  const templates = await approvalTemplateRepository.findByOrganization(
    session.user.organizationId
  );

  return { success: true as const, templates };
}

export async function submitRequestAction(
  requestId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const idempotencyKey = formData.get("idempotencyKey");
  if (isValidIdempotencyKey(idempotencyKey)) {
    const cached = await idempotencyKeyRepository.findByKey(
      idempotencyKey,
      session.user.organizationId
    );
    if (cached) {
      return cached.result as ActionResult;
    }
  }

  const rateCheck = await checkRateLimit({
    key: `approveReject:${session.user.id}`,
    limit: RATE_LIMITS.approveReject.limit,
    windowMs: RATE_LIMITS.approveReject.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const result = await submitRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  const actionResult: ActionResult = result.ok
    ? { success: true }
    : { success: false, message: result.reason };

  if (isValidIdempotencyKey(idempotencyKey)) {
    await idempotencyKeyRepository.create({
      key: idempotencyKey,
      action: "submitRequest",
      result: actionResult,
      organizationId: session.user.organizationId,
    });
  }

  if (!result.ok) {
    return actionResult;
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { success: true };
}

export async function approveRequestAction(
  requestId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (session.user.role === "member") {
    return { success: false, message: "権限がありません" };
  }

  const idempotencyKey = formData.get("idempotencyKey");
  if (isValidIdempotencyKey(idempotencyKey)) {
    const cached = await idempotencyKeyRepository.findByKey(
      idempotencyKey,
      session.user.organizationId
    );
    if (cached) {
      return cached.result as ActionResult;
    }
  }

  const rateCheck = await checkRateLimit({
    key: `approveReject:${session.user.id}`,
    limit: RATE_LIMITS.approveReject.limit,
    windowMs: RATE_LIMITS.approveReject.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const result = await approveRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    actorRole: session.user.role,
  });

  const actionResult: ActionResult = result.ok
    ? { success: true }
    : { success: false, message: result.reason };

  if (isValidIdempotencyKey(idempotencyKey)) {
    await idempotencyKeyRepository.create({
      key: idempotencyKey,
      action: "approveRequest",
      result: actionResult,
      organizationId: session.user.organizationId,
    });
  }

  if (!result.ok) {
    return actionResult;
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { success: true };
}

const BULK_APPROVE_MAX = 20;

const bulkApproveSchema = z.array(z.string());

export type BulkApproveActionResult = {
  success: boolean;
  message?: string;
  results?: Array<{ requestId: string; success: boolean; reason?: string }>;
};

export async function bulkApproveAction(
  requestIds: string[]
): Promise<BulkApproveActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (session.user.role === "member") {
    return { success: false, message: "権限がありません" };
  }

  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return { success: false, message: "申請が選択されていません" };
  }
  if (requestIds.length > BULK_APPROVE_MAX) {
    return { success: false, message: "一括承認は20件までです" };
  }

  const parsed = bulkApproveSchema.safeParse(requestIds);
  if (!parsed.success) {
    return { success: false, message: "入力が不正です" };
  }

  const result = await bulkApprove({
    requestIds: parsed.data,
    actorId: session.user.id,
    actorRole: session.user.role,
    organizationId: session.user.organizationId,
  });

  revalidatePath("/requests");

  return { success: true, results: result.results };
}

export async function rejectRequestAction(
  requestId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (session.user.role === "member") {
    return { success: false, message: "権限がありません" };
  }

  const idempotencyKey = formData.get("idempotencyKey");
  if (isValidIdempotencyKey(idempotencyKey)) {
    const cached = await idempotencyKeyRepository.findByKey(
      idempotencyKey,
      session.user.organizationId
    );
    if (cached) {
      return cached.result as ActionResult;
    }
  }

  const rateCheck = await checkRateLimit({
    key: `approveReject:${session.user.id}`,
    limit: RATE_LIMITS.approveReject.limit,
    windowMs: RATE_LIMITS.approveReject.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const rawTargetStatus = formData.get("targetStatus");
  const targetStatus =
    rawTargetStatus === "revision" ? "revision" : "rejected";
  const comment = formData.get("comment");

  const result = await rejectRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    targetStatus,
    comment: typeof comment === "string" && comment.trim() !== "" ? comment.trim() : undefined,
  });

  const actionResult: ActionResult = result.ok
    ? { success: true }
    : { success: false, message: result.reason };

  if (isValidIdempotencyKey(idempotencyKey)) {
    await idempotencyKeyRepository.create({
      key: idempotencyKey,
      action: "rejectRequest",
      result: actionResult,
      organizationId: session.user.organizationId,
    });
  }

  if (!result.ok) {
    return actionResult;
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { success: true };
}

export async function resubmitRequestAction(
  requestId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const idempotencyKey = formData.get("idempotencyKey");
  if (isValidIdempotencyKey(idempotencyKey)) {
    const cached = await idempotencyKeyRepository.findByKey(
      idempotencyKey,
      session.user.organizationId
    );
    if (cached) {
      return cached.result as ActionResult;
    }
  }

  const rateCheck = await checkRateLimit({
    key: `approveReject:${session.user.id}`,
    limit: RATE_LIMITS.approveReject.limit,
    windowMs: RATE_LIMITS.approveReject.windowMs,
  });
  if (!rateCheck.allowed) {
    return { success: false, message: "リクエスト数の上限に達しました。しばらく待ってから再試行してください" };
  }

  const result = await resubmitRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  const actionResult: ActionResult = result.ok
    ? { success: true }
    : { success: false, message: result.reason };

  if (isValidIdempotencyKey(idempotencyKey)) {
    await idempotencyKeyRepository.create({
      key: idempotencyKey,
      action: "resubmitRequest",
      result: actionResult,
      organizationId: session.user.organizationId,
    });
  }

  if (!result.ok) {
    return actionResult;
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { success: true };
}

export async function getApprovalStepsAction(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です", steps: [] };
  }

  const steps = await getApprovalSteps({
    requestId,
    organizationId: session.user.organizationId,
  });

  return { success: true, steps };
}
