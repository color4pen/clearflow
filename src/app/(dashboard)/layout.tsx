import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/infrastructure/auth";
import { ThemeToggle } from "./ThemeToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "admin";

  return (
    <div className="min-h-screen bg-bg-page">
      <header className="bg-bg-header">
        <div className="mx-auto px-2 py-0.5 flex items-center justify-between" style={{ maxWidth: 1200 }}>
          <div className="flex items-center gap-4">
            <span className="text-text-on-dark text-sm font-bold tracking-wide">Clearflow</span>
            <nav className="flex items-center gap-3">
              <Link
                href="/requests"
                className="text-text-on-dark-secondary hover:text-white text-sm"
              >
                申請一覧
              </Link>
              {isAdmin && (
                <Link
                  href="/settings/templates"
                  className="text-text-on-dark-muted hover:text-text-on-dark-secondary text-sm"
                >
                  設定
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/settings/audit-logs"
                  className="text-text-on-dark-muted hover:text-text-on-dark-secondary text-sm"
                >
                  監査ログ
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-text-on-dark-disabled text-xs">
              {session.user.name} / {session.user.role}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-text-on-dark-muted hover:text-text-on-dark-secondary text-xs ml-1"
              >
                [ログアウト]
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto px-2 py-2" style={{ maxWidth: 1200 }}>{children}</main>
    </div>
  );
}
