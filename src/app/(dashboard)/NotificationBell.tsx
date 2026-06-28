import { auth } from "@/infrastructure/auth";
import { getNotifications, listOrganizationUsers } from "@/application/usecases";
import { userRepository } from "@/infrastructure/repositories";
import { NotificationPanel } from "./NotificationPanel";

export async function NotificationBell() {
  const session = await auth();
  if (!session?.user) return null;

  const { userId, organizationId } = { userId: session.user.id, organizationId: session.user.organizationId };

  // current user の notificationsLastSeenAt は findById で直接取得する
  // actorNames マップ用には引き続き listOrganizationUsers を使用する
  const [currentUser, orgUsers] = await Promise.all([
    userRepository.findById(userId, organizationId),
    listOrganizationUsers({ organizationId }),
  ]);
  const notificationsLastSeenAt = currentUser?.notificationsLastSeenAt ?? null;

  const { notifications, unreadCount } = await getNotifications({
    userId,
    organizationId,
    notificationsLastSeenAt,
  });

  const actorNames: Record<string, string> = Object.fromEntries(
    orgUsers.map((u) => [u.id, u.name])
  );

  return (
    <NotificationPanel
      notifications={notifications}
      unreadCount={unreadCount}
      actorNames={actorNames}
    />
  );
}
