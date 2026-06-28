"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth";
import { organizationRepository } from "@/infrastructure/repositories";
import { updateOrganization } from "@/application/usecases";
import { canPerform } from "@/domain/authorization";

const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
});

export type UpdateOrganizationState =
  | null
  | { success: false; message: string }
  | { success: true };

export async function updateOrganizationAction(
  prevState: UpdateOrganizationState,
  formData: FormData
): Promise<UpdateOrganizationState> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "認証が必要です" };
  if (!canPerform(session.user.role, "organization", "updateOrganization"))
    return { success: false, message: "この操作を実行する権限がありません" };

  const rawData = {
    name: formData.get("name") as string,
  };

  const validation = updateOrganizationSchema.safeParse(rawData);
  if (!validation.success) {
    const errors = validation.error.flatten();
    return {
      success: false,
      message: Object.values(errors.fieldErrors).flat()[0] ?? "入力値が不正です",
    };
  }

  const result = await updateOrganization({
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    name: validation.data.name,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/settings/organization");
  return { success: true };
}

export async function getOrganizationAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, message: "認証が必要です" };

  const organization = await organizationRepository.findById(
    session.user.organizationId,
    session.user.organizationId
  );

  return { success: true as const, organization };
}
