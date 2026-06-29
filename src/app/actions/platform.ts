"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { isSuperAdmin } from "@/domain/services/superAdmin";
import { provisionOrganization, listAllOrganizations } from "@/application/usecases";

const provisionOrganizationSchema = z.object({
  organizationName: z.string().min(1, "組織名は必須です").max(100, "組織名は100文字以内で入力してください"),
  adminEmail: z.string().email("有効なメールアドレスを入力してください"),
  adminName: z.string().min(1, "管理者名は必須です"),
  adminPassword: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export type ProvisionOrganizationState =
  | null
  | { success: false; message: string }
  | { success: true };

export async function provisionOrganizationAction(
  prevState: ProvisionOrganizationState,
  formData: FormData
): Promise<ProvisionOrganizationState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (!isSuperAdmin(session.user.email)) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const rawData = {
    organizationName: formData.get("organizationName") as string,
    adminEmail: formData.get("adminEmail") as string,
    adminName: formData.get("adminName") as string,
    adminPassword: formData.get("adminPassword") as string,
  };

  const validation = provisionOrganizationSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await provisionOrganization({
    actorId: session.user.id,
    organizationName: validation.data.organizationName,
    adminEmail: validation.data.adminEmail,
    adminName: validation.data.adminName,
    adminPassword: validation.data.adminPassword,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/platform");
  return { success: true };
}

export async function listAllOrganizationsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false as const, message: "認証が必要です" };
  }
  if (!isSuperAdmin(session.user.email)) {
    return { success: false as const, message: "この操作を実行する権限がありません" };
  }

  const organizations = await listAllOrganizations();
  return { success: true as const, organizations };
}
