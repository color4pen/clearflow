import { auth } from "@/infrastructure/auth";
import { getNotifications, listOrganizationUsers } from "@/application/usecases";
import { NotificationPanel } from "./NotificationPanel";

export async function NotificationBell() {
  const session = await auth();
  if (!session?.user) return null;

  const { userId, organizationId } = { userId: session.user.id, organizationId: session.user.organizationId };

  // notificationsLastSeenAt はセッションには含まれないため、userRepository 経由で取得する必要があるが、
  // 既存の listOrganizationUsers からユーザー情報を取得してキャッシュを活用する
  const users = await listOrganizationUsers({ organizationId });
  const currentUser = users.find((u) => u.id === userId);
  const notificationsLastSeenAt = currentUser?.notificationsLastSeenAt ?? null;

  const { notifications, unreadCount } = await getNotifications({
    userId,
    organizationId,
    notificationsLastSeenAt,
  });

  const actorNames: Record<string, string> = Object.fromEntries(
    users.map((u) => [u.id, u.name])
  );

  return (
    <NotificationPanel
      notifications={notifications}
      unreadCount={unreadCount}
      actorNames={actorNames}
    />
  );
}
