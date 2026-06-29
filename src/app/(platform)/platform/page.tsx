import { listAllOrganizationsAction } from "@/app/actions/platform";
import { ProvisionForm } from "./ProvisionForm";

export default async function PlatformPage() {
  const result = await listAllOrganizationsAction();
  const organizations = result.success ? result.organizations : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">組織管理</h1>
        <p className="text-xs text-gray-500 mt-1">
          新規組織のプロビジョニングと組織一覧を管理します。
        </p>
      </div>

      {/* 組織一覧 */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">
          組織一覧 ({organizations.length})
        </h2>

        {organizations.length === 0 ? (
          <p className="text-xs text-gray-400">組織が存在しません。</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">
                  ID
                </th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">
                  名前
                </th>
                <th className="text-left py-2 font-medium text-gray-600">
                  作成日時
                </th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4 text-gray-400 font-mono">
                    {org.id}
                  </td>
                  <td className="py-2 pr-4 text-gray-900">{org.name}</td>
                  <td className="py-2 text-gray-500">
                    {org.createdAt.toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 組織作成フォーム */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <ProvisionForm />
      </section>
    </div>
  );
}
