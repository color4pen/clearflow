import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listTemplatesAction } from "@/app/actions/templates";
import { DeleteButton } from "./DeleteButton";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const result = await listTemplatesAction();
  const templates = result.success ? result.templates ?? [] : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            承認テンプレートの作成・編集・削除を行います。
          </p>
        </div>
        <Link
          href="/settings/templates/new"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          テンプレートを追加
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {templates.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            登録済みテンプレートはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">テンプレート名</th>
                  <th className="px-6 py-3">金額条件</th>
                  <th className="px-6 py-3">ステップ数</th>
                  <th className="px-6 py-3">作成日時</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map((template) => {
                  const amountLabel =
                    template.minAmount != null && template.maxAmount != null
                      ? `${template.minAmount.toLocaleString()}〜${template.maxAmount.toLocaleString()}円`
                      : template.minAmount != null
                      ? `${template.minAmount.toLocaleString()}円以上`
                      : template.maxAmount != null
                      ? `${template.maxAmount.toLocaleString()}円以下`
                      : "制限なし";

                  return (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {template.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{amountLabel}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {template.steps.length}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(template.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/settings/templates/${template.id}/edit`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            編集
                          </Link>
                          <DeleteButton templateId={template.id} />
                        </div>
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
