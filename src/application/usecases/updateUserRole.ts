import {
  userRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

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

  // Last admin guard: prevent demoting the only remaining admin in the organization
  if (currentUser.role === "admin" && data.newRole !== "admin") {
    const orgUsers = await userRepository.findByOrganization(data.organizationId);
    const otherAdmins = orgUsers.filter(
      (u) => u.role === "admin" && u.id !== data.targetUserId
    );
    if (otherAdmins.length === 0) {
      return { ok: false, reason: "組織に最低1人の管理者が必要です" };
    }
  }

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

      await recordAudit(
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
