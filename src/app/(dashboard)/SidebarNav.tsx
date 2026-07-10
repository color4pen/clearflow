"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  hasBadge?: boolean;
  adminOnly?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "メイン",
    items: [{ href: "/dashboard", label: "ダッシュボード", icon: "📊" }],
  },
  {
    label: "営業",
    items: [
      { href: "/clients", label: "顧客", icon: "🏢" },
      { href: "/inquiries", label: "引き合い", icon: "📨" },
      { href: "/deals", label: "案件", icon: "💼" },
      { href: "/tasks", label: "タスク", icon: "📋" },
    ],
  },
  {
    label: "管理",
    items: [
      { href: "/contracts", label: "契約", icon: "📁" },
      { href: "/revenue", label: "売上", icon: "💰" },
      { href: "/requests", label: "申請一覧", icon: "📝", hasBadge: true },
    ],
  },
  {
    label: "個人・設定",
    items: [
      { href: "/account", label: "アカウント", icon: "👤" },
      { href: "/settings/templates", label: "設定", icon: "⚙️", adminOnly: true },
      { href: "/settings/audit-logs", label: "監査ログ", icon: "🧾", adminOnly: true },
    ],
  },
];

type Props = {
  isAdmin: boolean;
  badgeCount?: number;
};

export function SidebarNav({ isAdmin, badgeCount }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto">
      {navSections.map((section) => {
        const visibleItems = section.items.filter(
          (item) => !item.adminOnly || isAdmin
        );
        if (visibleItems.length === 0) return null;

        return (
          <div key={section.label}>
            <div className="text-2xs font-semibold uppercase tracking-wider text-text-sidebar-muted px-4 pt-4 pb-1">
              {section.label}
            </div>
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm ${
                    isActive
                      ? "bg-white/10 text-white border-l-[3px] border-primary"
                      : "text-text-on-dark-secondary hover:bg-white/6"
                  }`}
                >
                  <span className="inline-block w-5">{item.icon}</span>
                  {item.label}
                  {item.hasBadge && badgeCount != null && badgeCount > 0 && (
                    <span className="ml-auto flex items-center justify-center bg-danger text-white text-2xs font-bold rounded-full min-w-4 h-4 px-1">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
