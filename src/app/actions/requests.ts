"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  createRequest,
  submitRequest,
  approveRequest,
  rejectRequest,
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

  await createRequest({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    organizationId: session.user.organizationId,
    creatorId: session.user.id,
  });

  revalidatePath("/requests");
  return {};
}

export async function submitRequestAction(
  requestId: string,
  _formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const result = await submitRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    throw new Error(result.reason);
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
}

export async function approveRequestAction(
  requestId: string,
  _formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (session.user.role !== "admin") return;

  const result = await approveRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    throw new Error(result.reason);
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
}

export async function rejectRequestAction(
  requestId: string,
  _formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  if (session.user.role !== "admin") return;

  const result = await rejectRequest({
    requestId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    throw new Error(result.reason);
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
}
