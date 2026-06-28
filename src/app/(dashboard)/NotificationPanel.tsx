"use client";

import { useState } from "react";
import Link from "next/link";
import { markNotificationsAsReadAction } from "@/app/actions/notifications";
import type { DerivedNotification } from "@/domain/models/notification";

type Props = {
  notifications: DerivedNotification[];
  unreadCount: number;
  actorNames: Record<string, string>;
};

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "deal.update": "案件を更新しました",
    "deal.updatePhase": "案件フェーズを変更しました",
    "meeting.create": "商談を追加しました",
    "action_item.create": "アクションアイテムを追加しました",
    "contract.create": "契約を追加しました",
  };
  return labels[action] ?? action;
}

export function NotificationPanel({ notifications, unreadCount, actorNames }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);

  async function handleMarkAsRead() {
    await markNotificationsAsReadAction();
    setLocalUnreadCount(0);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-8 h-8 text-text-on-dark-secondary hover:text-white"
        aria-label="通知"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {localUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-2xs font-bold bg-red-500 text-white rounded-full">
            {localUnreadCount > 99 ? "99+" : localUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-10 z-20 w-80 bg-white dark:bg-bg-card border border-border rounded shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-text">通知</span>
              {localUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAsRead}
                  className="text-2xs text-primary hover:underline"
                >
                  既読にする
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-xs text-text-muted text-center">
                  通知はありません
                </p>
              ) : (
                notifications.map((n) => {
                  const actorName = actorNames[n.log.actorId] ?? n.log.actorId;
                  const actionLabel = getActionLabel(n.log.action);
                  const targetLabel = n.targetInfo?.label ?? n.dealTitle;
                  const targetHref = n.targetInfo?.href;
                  const dateStr = n.log.createdAt.toLocaleDateString("ja-JP", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={n.log.id}
                      className={`px-3 py-2 border-b border-border last:border-0 ${
                        n.isUnread ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.isUnread && (
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <div className={`text-xs space-y-0.5 ${!n.isUnread ? "pl-3.5" : ""}`}>
                          <div className="text-text-muted">{dateStr}</div>
                          <div className="text-text">
                            <span className="font-medium">{actorName}</span>
                            {" が "}
                            {targetHref ? (
                              <Link
                                href={targetHref}
                                className="text-primary underline"
                                onClick={() => setIsOpen(false)}
                              >
                                {targetLabel}
                              </Link>
                            ) : (
                              <span>{targetLabel}</span>
                            )}
                            {" に"}
                          </div>
                          <div className="text-text-muted">{actionLabel}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
