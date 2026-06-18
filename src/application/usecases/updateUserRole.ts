import {
  userRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import { db } from "@/infrastructure/db";
import type { Role } from "@/domain/models/user";

export type UpdateUserRoleResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function updateUserRole(data: {
  targetUserId: string;
  organizationId: string;
  actorId: string;
  newRole: Role;
}): Promise<UpdateUserRoleResult> {
  // Self-modification guard
  if (data.actorId === data.targetUserId) {
    return { ok: false, reason: "自分自身のロールは変更できません" };
  }

  // Fetch current user to get old role and verify existence
  const currentUser = await userRepository.findById(
    data.targetUserId,
    data.organizationId
  );
  if (!currentUser) {
    return { ok: false, reason: "ユーザーが見つかりません" };
  }

  const oldRole = currentUser.role;

  try {
    await db.transaction(async (tx) => {
      const updated = await userRepository.updateRole(
        data.targetUserId,
        data.organizationId,
        data.newRole,
        tx
      );

      if (!updated) {
        throw new Error("ユーザーの更新に失敗しました");
      }

      await auditLogRepository.create(
        {
          action: "user.updateRole",
          targetType: "user",
          targetId: data.targetUserId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { oldRole, newRole: data.newRole },
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "ロールの変更に失敗しました",
    };
  }
}
