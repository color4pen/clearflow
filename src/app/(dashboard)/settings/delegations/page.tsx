import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import {
  listDelegationsAction,
  createDelegationAction,
  deactivateDelegationAction,
} from "@/app/actions/delegations";
import { listOrganizationUsers } from "@/application/usecases";
import { BTN_PRIMARY, SELECT_BASE, INPUT_BASE } from "../../styles";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">代理承認設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          承認権限の委譲（代理承認）を管理します。
        </p>
      </div>

      {/* Delegation list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">委譲一覧</h2>
        </div>
        {delegations.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            登録済みの委譲はありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">委譲元ユーザーID</th>
                  <th className="px-6 py-3">委譲先ユーザーID</th>
                  <th className="px-6 py-3">委譲元ロール</th>
                  <th className="px-6 py-3">開始日</th>
                  <th className="px-6 py-3">終了日</th>
                  <th className="px-6 py-3">状態</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {delegations.map((delegation) => {
                  const delegationId = delegation.id;

                  async function handleDeactivate() {
                    "use server";
                    await deactivateDelegationAction(delegationId);
                  }

                  return (
                    <tr key={delegation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs">{delegation.fromUserId}</td>
                      <td className="px-6 py-4 font-mono text-xs">{delegation.toUserId}</td>
                      <td className="px-6 py-4">{delegation.fromUserRole}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(delegation.startDate).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(delegation.endDate).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            delegation.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {delegation.isActive ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {delegation.isActive && (
                          <form action={handleDeactivate}>
                            <button
                              type="submit"
                              className="text-xs text-red-600 hover:text-red-800 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50"
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">委譲を追加</h2>
        </div>
        <div className="px-6 py-4">
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
                  className="block text-sm font-medium text-gray-700"
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
                  className="block text-sm font-medium text-gray-700"
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
                  className="block text-sm font-medium text-gray-700"
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
                  className="block text-sm font-medium text-gray-700"
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
                className={BTN_PRIMARY}
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
