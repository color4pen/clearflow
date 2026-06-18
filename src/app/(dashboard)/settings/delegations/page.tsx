import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import {
  listDelegationsAction,
  createDelegationAction,
  deactivateDelegationAction,
} from "@/app/actions/delegations";
import { listOrganizationUsers } from "@/application/usecases";
import { BTN_SUBMIT, SELECT_BASE, INPUT_BASE } from "../../styles";

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
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">代理承認設定</span>
      </div>

      {/* Delegation list */}
      <div className="bg-bg-surface border border-border-light mb-2">
        {delegations.length === 0 ? (
          <div className="text-center py-4 text-xs text-text-disabled">
            登録済みの委譲はありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-bg-table-head border border-border-table-head">
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">委譲元ユーザーID</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">委譲先ユーザーID</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">委譲元ロール</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">開始日</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">終了日</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">状態</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {delegations.map((delegation, index) => {
                  const delegationId = delegation.id;

                  async function handleDeactivate() {
                    "use server";
                    await deactivateDelegationAction(delegationId);
                  }

                  return (
                    <tr
                      key={delegation.id}
                      className={`border border-border-light hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-alt"}`}
                    >
                      <td className="px-1 py-1 text-xs text-text-muted">{delegation.fromUserId}</td>
                      <td className="px-1 py-1 text-xs text-text-muted">{delegation.toUserId}</td>
                      <td className="px-1 py-1 text-xs text-text">{delegation.fromUserRole}</td>
                      <td className="px-1 py-1 text-xs text-text-muted">
                        {new Date(delegation.startDate).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-1 py-1 text-xs text-text-muted">
                        {new Date(delegation.endDate).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-1 py-1 text-xs">
                        {delegation.isActive ? (
                          <span className="text-success text-xs font-bold">有効</span>
                        ) : (
                          <span className="text-text-disabled text-xs">無効</span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-xs">
                        {delegation.isActive && (
                          <form action={handleDeactivate}>
                            <button
                              type="submit"
                              className="text-xs text-danger underline"
                            >
                              無効化
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add delegation form */}
      <div className="bg-bg-surface border border-border-light">
        <div className="bg-bg-toolbar border-b border-border px-2 py-1">
          <span className="text-sm font-bold text-[#333333]">委譲を追加</span>
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
              <div>
                <label
                  htmlFor="fromUserId"
                  className="block text-xs font-bold text-text mb-1"
                >
                  委譲元ユーザー
                </label>
                <select
                  id="fromUserId"
                  name="fromUserId"
                  required
                  className={`mt-1 ${SELECT_BASE}`}
                >
                  <option value="">選択してください</option>
                  {orgUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（{user.role}）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="toUserId"
                  className="block text-xs font-bold text-text mb-1"
                >
                  委譲先ユーザー
                </label>
                <select
                  id="toUserId"
                  name="toUserId"
                  required
                  className={`mt-1 ${SELECT_BASE}`}
                >
                  <option value="">選択してください</option>
                  {orgUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（{user.role}）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-xs font-bold text-text mb-1"
                >
                  開始日
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  className={`mt-1 ${INPUT_BASE}`}
                />
              </div>
              <div>
                <label
                  htmlFor="endDate"
                  className="block text-xs font-bold text-text mb-1"
                >
                  終了日
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  required
                  className={`mt-1 ${INPUT_BASE}`}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className={BTN_SUBMIT}
              >
                委譲を追加
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
