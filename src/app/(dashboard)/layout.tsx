import { redirect } from "next/navigation";
import { auth, signOut } from "@/infrastructure/auth";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarNav } from "./SidebarNav";
import { DashboardProviders } from "./DashboardProviders";
import { NotificationBell } from "./NotificationBell";

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
    <div className="flex min-h-screen">
      <aside className="w-[210px] min-w-[210px] bg-bg-header flex flex-col h-screen sticky top-0">
        <div className="px-4 py-4">
          <div className="text-[15px] font-bold text-white">Clearflow</div>
          <div className="text-2xs text-text-sidebar-muted">案件管理</div>
        </div>

        <div className="px-4 py-2">
          <NotificationBell />
        </div>

        <SidebarNav isAdmin={isAdmin} />

        <div className="border-t border-white/10 px-4 py-3 flex flex-col gap-2">
          <div className="text-xs text-text-on-dark-disabled">
            {session.user.name} / {session.user.role}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-text-on-dark-muted hover:text-text-on-dark-secondary text-xs"
              >
                [ログアウト]
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-bg-page">
        <div style={{ maxWidth: 1260 }} className="mx-auto px-7 pt-[22px] pb-14">
          <DashboardProviders>{children}</DashboardProviders>
        </div>
      </main>
    </div>
  );
}
