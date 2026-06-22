import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import {
  listDelegationsAction,
  deactivateDelegationAction,
} from "@/app/actions/delegations";
import { listOrganizationUsers } from "@/application/usecases";
import { PageToolbar, DataTable, SectionCard } from "@/app/components";
import { AddDelegationForm } from "./AddDelegationForm";

export default async function DelegationsSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const [delegationsResult, orgUsers] = await Promise.all([
    listDelegationsAction(),
    listOrganizationUsers({ organizationId: session.user.organizationId }),
  ]);
  const delegations = delegationsResult.success
    ? delegationsResult.delegations ?? []
    : [];

  const userNameMap = new Map(orgUsers.map((u) => [u.id, u.name]));

  return (
    <div>
      {/* Toolbar */}
      <PageToolbar title="代理承認設定" />

      {/* Delegation list */}
      <div className="mb-2">
        {delegations.length === 0 ? (
          <SectionCard>
            <div className="text-center py-4 text-xs text-text-disabled">
              登録済みの委譲はありません。
            </div>
          </SectionCard>
        ) : (
          <DataTable
            columns={[
              { key: "fromUserId", header: "委譲元ユーザー", render: (d) => <span className="text-text-muted">{userNameMap.get(d.fromUserId) ?? d.fromUserId}</span> },
              { key: "toUserId", header: "委譲先ユーザー", render: (d) => <span className="text-text-muted">{userNameMap.get(d.toUserId) ?? d.toUserId}</span> },
              { key: "fromUserRole", header: "委譲元ロール", render: (d) => <span className="text-text">{d.fromUserRole}</span> },
              {
                key: "startDate",
                header: "開始日",
                render: (d) => (
                  <span className="text-text-muted">
                    {new Date(d.startDate).toLocaleDateString("ja-JP")}
                  </span>
                ),
              },
              {
                key: "endDate",
                header: "終了日",
                render: (d) => (
                  <span className="text-text-muted">
                    {new Date(d.endDate).toLocaleDateString("ja-JP")}
                  </span>
                ),
              },
              {
                key: "isActive",
                header: "状態",
                render: (d) =>
                  d.isActive ? (
                    <span className="text-success text-xs font-bold">有効</span>
                  ) : (
                    <span className="text-text-disabled text-xs">無効</span>
                  ),
              },
              {
                key: "actions",
                header: "操作",
                render: (d) => {
                  if (!d.isActive) return null;
                  const delegationId = d.id;

                  async function handleDeactivate() {
                    "use server";
                    await deactivateDelegationAction(delegationId);
                  }

                  return (
                    <form action={handleDeactivate}>
                      <button
                        type="submit"
                        className="text-xs text-danger underline"
                      >
                        無効化
                      </button>
                    </form>
                  );
                },
              },
            ]}
            rows={delegations}
            rowKey={(d) => d.id}
          />
        )}
      </div>

      {/* Add delegation form */}
      <SectionCard>
        <div className="bg-bg-toolbar border-b border-border px-2 py-1">
          <span className="text-sm font-bold text-text">委譲を追加</span>
        </div>
        <div className="p-4">
          <AddDelegationForm orgUsers={orgUsers.map((u) => ({ id: u.id, name: u.name, role: u.role }))} />
        </div>
      </SectionCard>
    </div>
  );
}
