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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          組織メンバーのロールを管理します。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {users.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            ユーザーが見つかりません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">名前</th>
                  <th className="px-6 py-3">メールアドレス</th>
                  <th className="px-6 py-3">ロール</th>
                  <th className="px-6 py-3">作成日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => {
                  const isSelf = user.id === session.user?.id;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-gray-400">（自分）</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <span className="text-sm text-gray-600">
                            {ROLE_LABELS[user.role] ?? user.role}
                            <span className="ml-2 text-xs text-gray-400">（変更不可）</span>
                          </span>
                        ) : (
                          <UserRoleSelect
                            userId={user.id}
                            currentRole={user.role as "admin" | "member" | "manager" | "finance"}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
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
