import { userRepository } from "@/infrastructure/repositories";

export type MarkNotificationsAsReadResult = { ok: true } | { ok: false; reason: string };

export async function markNotificationsAsRead(data: {
  userId: string;
  organizationId: string;
}): Promise<MarkNotificationsAsReadResult> {
  try {
    await userRepository.updateNotificationsLastSeenAt(
      data.userId,
      data.organizationId,
      new Date()
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "既読更新に失敗しました",
    };
  }
}
