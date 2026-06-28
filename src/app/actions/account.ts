"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { updateOwnProfile, changeOwnPassword } from "@/application/usecases";

const updateOwnProfileSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
});

export type UpdateOwnProfileState =
  | null
  | { success: false; message: string }
  | { success: true };

export async function updateOwnProfileAction(
  prevState: UpdateOwnProfileState,
  formData: FormData
): Promise<UpdateOwnProfileState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };

  const rawData = {
    name: formData.get("name") as string,
  };

  const validation = updateOwnProfileSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await updateOwnProfile({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    name: validation.data.name,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/account");
  return { success: true };
}

const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードは必須です"),
  newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください"),
});

export type ChangeOwnPasswordState =
  | null
  | { success: false; message: string }
  | { success: true };

export async function changeOwnPasswordAction(
  prevState: ChangeOwnPasswordState,
  formData: FormData
): Promise<ChangeOwnPasswordState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };

  const rawData = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
  };

  const validation = changeOwnPasswordSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await changeOwnPassword({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    currentPassword: validation.data.currentPassword,
    newPassword: validation.data.newPassword,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  return { success: true };
}
