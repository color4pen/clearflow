"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { createApiToken, revokeApiToken, listApiTokens } from "@/application/usecases";
import type { ApiToken } from "@/domain/models/apiToken";

// --- createApiTokenAction ---

const createApiTokenSchema = z.object({
  name: z.string().trim().min(1, "トークン名は必須です").max(100, "トークン名は100文字以内で入力してください"),
});

export type CreateApiTokenState =
  | null
  | { success: false; message: string }
  | { success: true; plainToken: string };

export async function createApiTokenAction(
  prevState: CreateApiTokenState,
  formData: FormData
): Promise<CreateApiTokenState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };

  const rawData = {
    name: formData.get("name") as string,
  };

  const validation = createApiTokenSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await createApiToken({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    name: validation.data.name,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/account");
  return { success: true, plainToken: result.plainToken };
}

// --- revokeApiTokenAction ---

const revokeApiTokenSchema = z.object({
  tokenId: z.string().uuid("無効なトークン ID です"),
});

export type RevokeApiTokenState =
  | null
  | { success: false; message: string }
  | { success: true };

export async function revokeApiTokenAction(
  prevState: RevokeApiTokenState,
  formData: FormData
): Promise<RevokeApiTokenState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };

  const rawData = {
    tokenId: formData.get("tokenId") as string,
  };

  const validation = revokeApiTokenSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await revokeApiToken({
    tokenId: validation.data.tokenId,
    userId: session.user.id,
    organizationId: session.user.organizationId,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/account");
  return { success: true };
}

// --- listApiTokensAction ---

export type ListApiTokensResult =
  | { success: false; message: string }
  | { success: true; tokens: ApiToken[] };

export async function listApiTokensAction(): Promise<ListApiTokensResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };

  const tokens = await listApiTokens({
    userId: session.user.id,
    organizationId: session.user.organizationId,
  });

  return { success: true, tokens };
}
