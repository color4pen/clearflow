import bcrypt from "bcryptjs";
import { userRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";

export type ChangeOwnPasswordResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function changeOwnPassword(data: {
  userId: string;
  organizationId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangeOwnPasswordResult> {
  const user = await userRepository.findByIdForAuth(
    data.userId,
    data.organizationId
  );

  if (!user) {
    return { ok: false, reason: "ユーザーが見つかりません" };
  }

  const passwordMatch = await bcrypt.compare(
    data.currentPassword,
    user.hashedPassword
  );
  if (!passwordMatch) {
    return { ok: false, reason: "現在のパスワードが正しくありません" };
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 12);

  try {
    await db.transaction(async (tx) => {
      const updated = await userRepository.updatePassword(
        data.userId,
        data.organizationId,
        hashedPassword,
        tx
      );

      if (!updated) {
        throw new Error("パスワードの更新に失敗しました");
      }

      await recordAudit(
        {
          action: "user.updatePassword",
          targetType: "user",
          targetId: data.userId,
          actorId: data.userId,
          organizationId: data.organizationId,
        },
        tx
      );
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason:
        err instanceof Error ? err.message : "パスワードの変更に失敗しました",
    };
  }
}
