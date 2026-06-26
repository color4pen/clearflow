"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  hasBadge?: boolean;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/clients", label: "顧客" },
  { href: "/inquiries", label: "引き合い" },
  { href: "/deals", label: "案件" },
  { href: "/tasks", label: "タスク" },
  { href: "/contracts", label: "契約" },
  { href: "/revenue", label: "売上" },
  { href: "/requests", label: "申請一覧", hasBadge: true },
  { href: "/settings/templates", label: "設定", adminOnly: true },
  { href: "/settings/audit-logs", label: "監査ログ", adminOnly: true },
];

type Props = {
  isAdmin: boolean;
};

export function SidebarNav({ isAdmin }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto">
      {navItems.map((item) => {
        if (item.adminOnly && !isAdmin) return null;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-4 py-2 text-sm ${
              isActive
                ? "bg-white/10 text-white border-l-2 border-white"
                : "text-text-on-dark-secondary hover:bg-white/6"
            }`}
          >
            {item.label}
            {item.hasBadge && (
              <span className="ml-auto hidden" aria-hidden="true" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
