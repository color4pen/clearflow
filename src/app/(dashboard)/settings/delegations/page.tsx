import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import {
  listDelegationsAction,
  createDelegationAction,
  deactivateDelegationAction,
} from "@/app/actions/delegations";
import { listOrganizationUsers } from "@/application/usecases";
import { PageToolbar, DataTable, SectionCard, FormField, Select, Input, SubmitButton } from "@/app/components";

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
              { key: "fromUserId", header: "委譲元ユーザーID", render: (d) => <span className="text-text-muted">{d.fromUserId}</span> },
              { key: "toUserId", header: "委譲先ユーザーID", render: (d) => <span className="text-text-muted">{d.toUserId}</span> },
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
          <form
            action={async (formData: FormData) => {
              "use server";
              await createDelegationAction(formData);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="委譲元ユーザー" htmlFor="fromUserId">
                <Select
                  id="fromUserId"
                  name="fromUserId"
                  required
                  className="mt-1"
                >
                  <option value="">選択してください</option>
                  {orgUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（{user.role}）
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="委譲先ユーザー" htmlFor="toUserId">
                <Select
                  id="toUserId"
                  name="toUserId"
                  required
                  className="mt-1"
                >
                  <option value="">選択してください</option>
                  {orgUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（{user.role}）
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="開始日" htmlFor="startDate">
                <Input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  className="mt-1"
                />
              </FormField>
              <FormField label="終了日" htmlFor="endDate">
                <Input
                  type="date"
                  id="endDate"
                  name="endDate"
                  required
                  className="mt-1"
                />
              </FormField>
            </div>
            <div>
              <SubmitButton>委譲を追加</SubmitButton>
            </div>
          </form>
        </div>
      </SectionCard>
    </div>
  );
}
