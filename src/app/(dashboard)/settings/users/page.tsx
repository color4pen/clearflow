import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { listUsersAction } from "@/app/actions/users";
import { UserRoleSelect } from "./UserRoleSelect";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  manager: "マネージャー",
  finance: "経理",
  member: "メンバー",
};

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const result = await listUsersAction();
  const users = result.success ? result.users ?? [] : [];

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">ユーザー管理</span>
      </div>

      <div className="bg-bg-surface border border-border-light">
        {users.length === 0 ? (
          <div className="text-center py-4 text-xs text-text-disabled">
            ユーザーが見つかりません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-bg-table-head border border-border-table-head">
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">名前</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">メールアドレス</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">ロール</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">作成日時</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const isSelf = user.id === session.user?.id;
                  return (
                    <tr
                      key={user.id}
                      className={`border border-border-light hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-alt"}`}
                    >
                      <td className="px-1 py-1 text-xs text-text">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-text-disabled">（自分）</span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-xs text-text">{user.email}</td>
                      <td className="px-1 py-1 text-xs">
                        {isSelf ? (
                          <span className="text-xs text-text">
                            {ROLE_LABELS[user.role] ?? user.role}
                            <span className="ml-2 text-xs text-text-disabled">（変更不可）</span>
                          </span>
                        ) : (
                          <UserRoleSelect
                            userId={user.id}
                            currentRole={user.role as "admin" | "member" | "manager" | "finance"}
                          />
                        )}
                      </td>
                      <td className="px-1 py-1 text-xs text-text-muted">
                        {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
