"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { approvalTemplateRepository } from "@/infrastructure/repositories";
import {
  createRequest,
  submitRequest,
  approveRequest,
  rejectRequest,
  resubmitRequest,
  getApprovalSteps,
} from "@/application/usecases";

const createRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
});

export type CreateRequestState = {
  errors?: {
    title?: string[];
    description?: string[];
  };
  message?: string;
};

export type ActionResult = { success: boolean; message?: string };

export async function createRequestAction(
  prevState: CreateRequestState,
  formData: FormData
): Promise<CreateRequestState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { message: "認証が必要です" };
  }

  const parsed = createRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const rawTemplateId = formData.get("templateId");
  const templateId =
    typeof rawTemplateId === "string" && rawTemplateId.trim() !== ""
      ? rawTemplateId.trim()
      : undefined;

  await createRequest({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    organizationId: session.user.organizationId,
    creatorId: session.user.id,
    templateId,
  });

  revalidatePath("/requests");
  return {};
}

export async function submitRequestAction(
  requestId: string,
  _formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const result = await submitRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { success: true };
}

export async function approveRequestAction(
  requestId: string,
  _formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (session.user.role !== "admin") {
    return { success: false, message: "権限がありません" };
  }

  const result = await approveRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    actorRole: session.user.role,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
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
  if (session.user.role !== "admin") {
    return { success: false, message: "権限がありません" };
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

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { success: true };
}

export async function resubmitRequestAction(
  requestId: string,
  _formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const result = await resubmitRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { success: true };
}

export async function listApprovalTemplatesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です", templates: [] };
  }

  const templates = await approvalTemplateRepository.findByOrganization(
    session.user.organizationId
  );

  return { success: true, templates };
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
