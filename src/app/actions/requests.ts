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
} from "@/application/usecases";
import { idempotencyKeyRepository } from "@/infrastructure/repositories";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";

const createRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
  amount: z.coerce.number().int().nonnegative().optional(),
});

export type CreateRequestState = {
  errors?: {
    title?: string[];
    description?: string[];
    amount?: string[];
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

  const rawAmount = formData.get("amount");
  const parsed = createRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    amount:
      rawAmount !== null && rawAmount !== "" ? rawAmount : undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createRequest({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    amount: parsed.data.amount ?? null,
    organizationId: session.user.organizationId,
    creatorId: session.user.id,
  });

  if (!result.ok) {
    return { message: result.reason };
  }

  revalidatePath("/requests");
  return {};
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
