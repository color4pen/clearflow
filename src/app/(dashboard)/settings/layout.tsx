import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";

const NAV_ITEMS = [
  { href: "/settings/webhooks", label: "Webhook" },
  { href: "/settings/templates", label: "テンプレート" },
  { href: "/settings/users", label: "ユーザー" },
  { href: "/settings/audit-logs", label: "監査ログ" },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  return (
    <div className="space-y-6">
      <nav className="border-b border-gray-200">
        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-md transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
