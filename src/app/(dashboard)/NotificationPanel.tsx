"use client";

import { useEffect, useState } from "react";
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
  // 「既読にする」押下後はバッジとリストの両方を既読表示に揃える
  const [allRead, setAllRead] = useState(false);

  const displayUnreadCount = allRead ? 0 : unreadCount;

  async function handleMarkAsRead() {
    await markNotificationsAsReadAction();
    setAllRead(true);
  }

  // ESC キーで flyout を閉じる
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* トリガー: サイドバー下部のラベル付き行 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-on-dark-secondary hover:bg-white/6"
        aria-label="通知"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 flex-shrink-0"
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
        <span>通知</span>
        {displayUnreadCount > 0 && (
          <span className="ml-auto flex items-center justify-center min-w-4 h-4 px-1 text-2xs font-bold bg-danger text-white rounded-full">
            {displayUnreadCount > 99 ? "99+" : displayUnreadCount}
          </span>
        )}
      </button>

      {/* dim オーバーレイ: 画面全体を覆い、パネル以外のクリックで閉じる（フェード） */}
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* clip 領域: 本文側に置き、パネルをサイドバー境界でクリップする
          （閉じる際にパネルがサイドバー上を横切らずに境界で消える） */}
      <div className="fixed top-0 left-[220px] right-0 h-screen z-40 overflow-hidden pointer-events-none">
        {/* flyout: clip 内を左→右にスライドして開閉する */}
        <div
          className={`h-full w-[340px] bg-white dark:bg-bg-surface border-r border-border shadow-xl flex flex-col pointer-events-auto transition-transform duration-200 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-label="通知"
          aria-hidden={!isOpen}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-text">通知</span>
            <div className="flex items-center gap-3">
              {displayUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAsRead}
                  className="text-2xs text-primary hover:underline"
                >
                  既読にする
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-text-muted hover:text-text"
                aria-label="閉じる"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-xs text-text-muted text-center">
                通知はありません
              </p>
            ) : (
              notifications.map((n) => {
                const actorName = actorNames[n.log.actorId] ?? n.log.actorId;
                const actionLabel = getActionLabel(n.log.action);
                const targetLabel = n.targetInfo?.label ?? n.dealTitle;
                const targetHref = n.targetInfo?.href;
                const isUnread = n.isUnread && !allRead;
                const dateStr = n.log.createdAt.toLocaleDateString("ja-JP", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={n.log.id}
                    className={`px-4 py-2 border-b border-border last:border-0 ${
                      isUnread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isUnread && (
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <div className={`text-xs space-y-0.5 ${!isUnread ? "pl-3.5" : ""}`}>
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
      </div>
    </>
  );
}
