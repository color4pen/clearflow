"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { userRepository } from "@/infrastructure/repositories";
import { updateUserRole } from "@/application/usecases";

const updateUserRoleSchema = z.object({
  userId: z.string().uuid("有効なユーザー ID を指定してください"),
  role: z.enum(["admin", "member", "manager", "finance"]),
});

export async function listUsersAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false as const, message: "権限がありません" };

  const users = await userRepository.findByOrganization(
    session.user.organizationId
  );

  return { success: true as const, users };
}

export async function updateUserRoleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };
  if (session.user.role !== "admin") return { success: false as const, message: "権限がありません" };

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
