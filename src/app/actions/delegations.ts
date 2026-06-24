"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import {
  createDelegation,
  deactivateDelegation,
  listDelegations,
} from "@/application/usecases";
import { canPerform } from "@/domain/authorization";
import { approvalDelegationRepository } from "@/infrastructure/repositories";

const createDelegationSchema = z.object({
  fromUserId: z.string().uuid("fromUserId は UUID 形式でなければなりません"),
  toUserId: z.string().uuid("toUserId は UUID 形式でなければなりません"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function createDelegationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (!canPerform(session.user.role, "approvalSettings", "createDelegation")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const parsed = createDelegationSchema.safeParse({
    fromUserId: formData.get("fromUserId"),
    toUserId: formData.get("toUserId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, message: `バリデーションエラー: ${issues}` };
  }

  // admin 以外は自身の委任のみ作成可能
  if (session.user.role !== "admin" && parsed.data.fromUserId !== session.user.id) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const result = await createDelegation({
    fromUserId: parsed.data.fromUserId,
    toUserId: parsed.data.toUserId,
    organizationId: session.user.organizationId,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/settings/delegations");

  return { success: true, delegation: result.delegation };
}

export async function deactivateDelegationAction(delegationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (!canPerform(session.user.role, "approvalSettings", "deactivateDelegation")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  // admin 以外は自身の委任のみ無効化可能
  if (session.user.role !== "admin") {
    const delegations = await approvalDelegationRepository.findByOrganization(
      session.user.organizationId
    );
    const delegation = delegations.find((d) => d.id === delegationId);
    if (!delegation) {
      return { success: false, message: "委任が見つかりません" };
    }
    if (delegation.fromUserId !== session.user.id) {
      return { success: false, message: "この操作を実行する権限がありません" };
    }
  }

  const result = await deactivateDelegation({
    delegationId,
    organizationId: session.user.organizationId,
    actorId: session.user.id,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/settings/delegations");

  return { success: true };
}

export async function listDelegationsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }
  if (!canPerform(session.user.role, "approvalSettings", "listDelegations")) {
    return { success: false, message: "この操作を実行する権限がありません" };
  }

  const delegations = await listDelegations({
    organizationId: session.user.organizationId,
  });

  // admin 以外は自身の委任のみ参照可能
  const filtered =
    session.user.role === "admin"
      ? delegations
      : delegations.filter((d) => d.fromUserId === session.user.id);

  return { success: true, delegations: filtered };
}
