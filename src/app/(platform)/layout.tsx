import { redirect } from "next/navigation";
import { auth, signOut } from "@/infrastructure/auth";
import { isSuperAdmin } from "@/domain/services/superAdmin";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!isSuperAdmin(session.user.email)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-base font-bold">Clearflow Platform</div>
          <div className="text-xs text-gray-400">スーパー管理者コンソール</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-300">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
