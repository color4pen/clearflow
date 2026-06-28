"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings/organization", label: "組織" },
  { href: "/settings/policies", label: "承認ポリシー" },
  { href: "/settings/templates", label: "テンプレート" },
  { href: "/settings/users", label: "ユーザー" },
  { href: "/settings/delegations", label: "代理承認" },
  { href: "/settings/webhooks", label: "Webhook" },
  { href: "/settings/audit-logs", label: "監査ログ" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-bg-toolbar border border-border">
      <div className="flex gap-0">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-xs transition-colors ${
                isActive
                  ? "text-text font-bold bg-bg-surface border-b-0"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
