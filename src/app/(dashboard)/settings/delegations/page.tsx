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

  const myDelegations = delegations.filter(
    (d) => d.fromUserId === session.user?.id
  );

  const columns = [
    { key: "fromUserId", header: "委譲元ユーザー", render: (d: (typeof delegations)[number]) => <span className="text-text-muted">{userNameMap.get(d.fromUserId) ?? d.fromUserId}</span> },
    { key: "toUserId", header: "委譲先ユーザー", render: (d: (typeof delegations)[number]) => <span className="text-text-muted">{userNameMap.get(d.toUserId) ?? d.toUserId}</span> },
    { key: "fromUserRole", header: "委譲元ロール", render: (d: (typeof delegations)[number]) => <span className="text-text">{d.fromUserRole}</span> },
    {
      key: "startDate",
      header: "開始日",
      render: (d: (typeof delegations)[number]) => (
        <span className="text-text-muted">
          {new Date(d.startDate).toLocaleDateString("ja-JP")}
        </span>
      ),
    },
    {
      key: "endDate",
      header: "終了日",
      render: (d: (typeof delegations)[number]) => (
        <span className="text-text-muted">
          {new Date(d.endDate).toLocaleDateString("ja-JP")}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "状態",
      render: (d: (typeof delegations)[number]) =>
        d.isActive ? (
          <span className="text-success text-xs font-bold">有効</span>
        ) : (
          <span className="text-text-disabled text-xs">無効</span>
        ),
    },
    {
      key: "actions",
      header: "操作",
      render: (d: (typeof delegations)[number]) => {
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
  ];

  return (
    <div>
      {/* Toolbar */}
      <PageToolbar title="代理承認設定" />

      {/* Section 1: 自分の委任 */}
      <SectionCard className="mb-2">
        <div className="bg-bg-toolbar border-b border-border px-2 py-1">
          <span className="text-sm font-bold text-text">自分の委任</span>
        </div>
        {myDelegations.length === 0 ? (
          <div className="text-center py-4 text-xs text-text-disabled">
            自分の委任はありません。
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={myDelegations}
            rowKey={(d) => d.id}
          />
        )}
      </SectionCard>

      {/* Section 2: 全ユーザーの委任 */}
      <SectionCard className="mb-2">
        <div className="bg-bg-toolbar border-b border-border px-2 py-1">
          <span className="text-sm font-bold text-text">全ユーザーの委任</span>
        </div>
        {delegations.length === 0 ? (
          <div className="text-center py-4 text-xs text-text-disabled">
            登録済みの委譲はありません。
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={delegations}
            rowKey={(d) => d.id}
          />
        )}
      </SectionCard>

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
