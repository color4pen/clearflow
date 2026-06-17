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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Clearflow</h1>
            <span className="text-sm text-gray-500">
              承認ワークフロー
            </span>
          </div>
          <div className="flex items-center gap-4">
            {session.user.role === "admin" && (
              <Link
                href="/settings/webhooks"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                設定
              </Link>
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500">
                {session.user.role === "admin" ? "管理者" : "メンバー"}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
