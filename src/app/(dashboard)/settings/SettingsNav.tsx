"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings/webhooks", label: "Webhook" },
  { href: "/settings/templates", label: "テンプレート" },
  { href: "/settings/users", label: "ユーザー" },
  { href: "/settings/delegations", label: "代理承認" },
  { href: "/settings/audit-logs", label: "監査ログ" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#f5f5f5] border border-[#cccccc]">
      <div className="flex gap-0">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-xs transition-colors ${
                isActive
                  ? "text-[#2c3e50] font-bold bg-white border-b-0"
                  : "text-[#7f8c8d] hover:text-[#2c3e50]"
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
