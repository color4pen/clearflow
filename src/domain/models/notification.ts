import type { AuditLog } from "./auditLog";

export const NOTIFICATION_ACTIONS = [
  "deal.update",
  "deal.updatePhase",
  "meeting.create",
  "action_item.create",
  "contract.create",
] as const;

export type NotificationAction = (typeof NOTIFICATION_ACTIONS)[number];

export type TargetInfo = {
  label: string;
  href?: string;
};

export type DerivedNotification = {
  log: AuditLog;
  dealId: string;
  dealTitle: string;
  targetInfo: TargetInfo | null;
  isUnread: boolean;
};

export type GetNotificationsResult = {
  notifications: DerivedNotification[];
  unreadCount: number;
};
