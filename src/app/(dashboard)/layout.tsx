import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/infrastructure/auth";

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-white text-[13px] font-bold">Clearflow</span>
            <nav className="flex items-center gap-4">
              <Link
                href="/requests"
                className="text-slate-300 hover:text-white text-xs"
              >
                申請一覧
              </Link>
              {isAdmin && (
                <Link
                  href="/settings/templates"
                  className="text-slate-300 hover:text-white text-xs"
                >
                  設定
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/settings/audit-logs"
                  className="text-slate-300 hover:text-white text-xs"
                >
                  監査ログ
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-300 text-xs">
              {session.user.name}（{session.user.role === "admin" ? "管理者" : session.user.role === "manager" ? "マネージャー" : session.user.role === "finance" ? "経理" : "メンバー"}）
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-slate-400 hover:text-white text-xs border border-slate-600 rounded px-2 py-0.5"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
