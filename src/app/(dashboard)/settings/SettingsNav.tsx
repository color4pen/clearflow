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
    <nav className="border-b border-gray-200">
      <div className="flex gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
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
