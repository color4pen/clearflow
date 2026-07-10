import { redirect } from "next/navigation";
import { auth, signOut } from "@/infrastructure/auth";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarNav } from "./SidebarNav";
import { DashboardProviders } from "./DashboardProviders";
import { NotificationBell } from "./NotificationBell";
import { listRequests } from "@/application/usecases";

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

  const requests = await listRequests(session.user.organizationId);
  const role = session.user.role;
  const badgeCount = requests.filter(
    (r) =>
      r.status === "pending" &&
      (r.approvalSteps.length === 0 ||
        r.approvalSteps.some((s) => s.status === "pending" && s.approverRole === role))
  ).length;

  return (
    <div className="flex min-h-screen">
      <aside className="w-[220px] min-w-[220px] bg-bg-header flex flex-col h-screen sticky top-0">
        <div className="h-14 flex flex-col justify-center px-4 border-b border-white/10">
          <div className="text-[15px] font-bold text-white">Clearflow</div>
          <div className="text-2xs text-text-sidebar-muted">案件管理</div>
        </div>

        <SidebarNav isAdmin={isAdmin} badgeCount={badgeCount} />

        <div className="border-t border-white/10">
          <NotificationBell />
        </div>

        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3">
          {/* 頭文字アバター */}
          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
            {session.user.name?.charAt(0) ?? "?"}
          </div>
          {/* 縦 2 段テキスト */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-on-dark-secondary truncate">{session.user.name}</div>
            <div className="text-2xs text-text-on-dark-muted">{session.user.role}</div>
          </div>
          {/* ThemeToggle + ログアウト */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-status-red-text hover:opacity-80 text-xs"
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
