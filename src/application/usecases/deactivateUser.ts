import { userRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";

export type DeactivateUserResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deactivateUser(data: {
  actorId: string;
  targetUserId: string;
  organizationId: string;
}): Promise<DeactivateUserResult> {
  // Guard 1: self-deactivation is not allowed
  if (data.actorId === data.targetUserId) {
    return { ok: false, reason: "自分自身は無効化できません" };
  }

  // Guard 2: target user must exist in the organization
  const targetUser = await userRepository.findById(
    data.targetUserId,
    data.organizationId
  );
  if (!targetUser) {
    return { ok: false, reason: "ユーザーが見つかりません" };
  }

  // Guard 3: cannot deactivate the last active admin in the organization
  if (targetUser.role === "admin") {
    const orgUsers = await userRepository.findByOrganization(data.organizationId);
    const otherActiveAdmins = orgUsers.filter(
      (u) => u.role === "admin" && u.id !== data.targetUserId && u.deactivatedAt === null
    );
    if (otherActiveAdmins.length === 0) {
      return { ok: false, reason: "組織に最低1人の管理者が必要です" };
    }
  }

  try {
    await db.transaction(async (tx) => {
      const updated = await userRepository.deactivate(
        data.targetUserId,
        data.organizationId,
        tx
      );

      if (!updated) {
        throw new Error("ユーザーの無効化に失敗しました");
      }

      await recordAudit(
        {
          action: "user.deactivate",
          targetType: "user",
          targetId: data.targetUserId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    // 例外詳細（DB エラー文等）はクライアントに返さず、サーバー側にのみ記録する
    console.error("deactivateUser failed", err);
    return { ok: false, reason: "ユーザーの無効化に失敗しました" };
  }
}
