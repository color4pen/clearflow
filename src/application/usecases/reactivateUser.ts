import { userRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";

export type ReactivateUserResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function reactivateUser(data: {
  actorId: string;
  targetUserId: string;
  organizationId: string;
}): Promise<ReactivateUserResult> {
  // Target user must exist in the organization
  const targetUser = await userRepository.findById(
    data.targetUserId,
    data.organizationId
  );
  if (!targetUser) {
    return { ok: false, reason: "ユーザーが見つかりません" };
  }

  // Early return: user is already active
  if (targetUser.deactivatedAt === null) {
    return { ok: false, reason: "ユーザーはすでに有効です" };
  }

  try {
    await db.transaction(async (tx) => {
      const updated = await userRepository.reactivate(
        data.targetUserId,
        data.organizationId,
        tx
      );

      if (!updated) {
        throw new Error("ユーザーの再有効化に失敗しました");
      }

      await recordAudit(
        {
          action: "user.reactivate",
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
    console.error("reactivateUser failed", err);
    return { ok: false, reason: "ユーザーの再有効化に失敗しました" };
  }
}
