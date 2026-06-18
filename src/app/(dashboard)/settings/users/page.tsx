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
      <div className="bg-[#f5f5f5] border border-[#cccccc] px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">ユーザー管理</span>
      </div>

      <div className="bg-white border border-[#e0e0e0]">
        {users.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#95a5a6]">
            ユーザーが見つかりません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#dcdde1] border border-[#bdc3c7]">
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">名前</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">メールアドレス</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">ロール</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">作成日時</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const isSelf = user.id === session.user?.id;
                  return (
                    <tr
                      key={user.id}
                      className={`border border-[#e0e0e0] hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}`}
                    >
                      <td className="px-1 py-1 text-xs text-[#2c3e50]">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-[#95a5a6]">（自分）</span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-xs text-[#2c3e50]">{user.email}</td>
                      <td className="px-1 py-1 text-xs">
                        {isSelf ? (
                          <span className="text-xs text-[#2c3e50]">
                            {ROLE_LABELS[user.role] ?? user.role}
                            <span className="ml-2 text-xs text-[#95a5a6]">（変更不可）</span>
                          </span>
                        ) : (
                          <UserRoleSelect
                            userId={user.id}
                            currentRole={user.role as "admin" | "member" | "manager" | "finance"}
                          />
                        )}
                      </td>
                      <td className="px-1 py-1 text-xs text-[#7f8c8d]">
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
