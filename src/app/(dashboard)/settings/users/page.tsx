import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { listUsersAction } from "@/app/actions/users";
import { UserRoleSelect } from "./UserRoleSelect";
import { UserDeactivateButton } from "./UserDeactivateButton";
import { CreateUserForm } from "./CreateUserForm";
import { PageToolbar, DataTable, SectionCard } from "@/app/components";

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
      <PageToolbar title="ユーザー管理" />

      {/* User creation form */}
      <SectionCard>
        <CreateUserForm />
      </SectionCard>

      {users.length === 0 ? (
        <SectionCard>
          <div className="text-center py-4 text-xs text-text-disabled">
            ユーザーが見つかりません。
          </div>
        </SectionCard>
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "名前",
              render: (user) => (
                <span className={user.deactivatedAt ? "text-text-disabled" : "text-text"}>
                  {user.name}
                  {user.id === session.user?.id && (
                    <span className="ml-2 text-xs text-text-disabled">（自分）</span>
                  )}
                </span>
              ),
            },
            {
              key: "email",
              header: "メールアドレス",
              render: (user) => (
                <span className={user.deactivatedAt ? "text-text-disabled" : "text-text"}>
                  {user.email}
                </span>
              ),
            },
            {
              key: "role",
              header: "ロール",
              render: (user) => {
                const isSelf = user.id === session.user?.id;
                if (isSelf) {
                  return (
                    <span className="text-xs text-text">
                      {ROLE_LABELS[user.role] ?? user.role}
                      <span className="ml-2 text-xs text-text-disabled">（変更不可）</span>
                    </span>
                  );
                }
                return (
                  <UserRoleSelect
                    userId={user.id}
                    currentRole={user.role as "admin" | "member" | "manager" | "finance"}
                    disabled={!!user.deactivatedAt}
                  />
                );
              },
            },
            {
              key: "status",
              header: "状態",
              render: (user) => (
                <span className={`text-xs ${user.deactivatedAt ? "text-text-disabled" : "text-text"}`}>
                  {user.deactivatedAt ? "無効" : "有効"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "操作",
              render: (user) => {
                if (user.id === session.user?.id) {
                  return null;
                }
                return (
                  <UserDeactivateButton
                    userId={user.id}
                    isDeactivated={!!user.deactivatedAt}
                  />
                );
              },
            },
          ]}
          rows={users}
          rowKey={(user) => user.id}
        />
      )}
    </div>
  );
}
