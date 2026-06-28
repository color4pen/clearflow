"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { userRepository } from "@/infrastructure/repositories";
import { updateUserRole, createUser } from "@/application/usecases";
import { canPerform } from "@/domain/authorization";

const createUserSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  name: z.string().min(1, "名前は必須です"),
  role: z.enum(["admin", "member", "manager", "finance"]),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export type CreateUserState =
  | null
  | { success: false; message: string }
  | { success: true };

export async function createUserAction(
  prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  if (!canPerform(session.user.role, "organization", "createUser"))
    return { success: false, message: "この操作を実行する権限がありません" };

  const rawData = {
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    password: formData.get("password") as string,
  };

  const validation = createUserSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await createUser({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    email: validation.data.email,
    name: validation.data.name,
    role: validation.data.role,
    password: validation.data.password,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/settings/users");
  return { success: true };
}

const updateUserRoleSchema = z.object({
  userId: z.string().uuid("有効なユーザー ID を指定してください"),
  role: z.enum(["admin", "member", "manager", "finance"]),
});

export async function listUsersAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (!canPerform(session.user.role, "organization", "listUsers")) return { success: false as const, message: "この操作を実行する権限がありません" };

  const users = await userRepository.findByOrganization(
    session.user.organizationId
  );

  return { success: true as const, users };
}

export async function updateUserRoleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (!canPerform(session.user.role, "organization", "changeRole")) return { success: false as const, message: "この操作を実行する権限がありません" };

  const rawData = {
    userId: formData.get("userId") as string,
    role: formData.get("role") as string,
  };

  const validation = updateUserRoleSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false as const,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await updateUserRole({
    targetUserId: validation.data.userId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    newRole: validation.data.role,
  });

  if (!result.ok) {
    return { success: false as const, message: result.reason };
  }

  revalidatePath("/settings/users");
  return { success: true as const };
}
