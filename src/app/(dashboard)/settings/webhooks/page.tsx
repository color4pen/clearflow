import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import {
  listWebhookEndpointsAction,
  deleteWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "@/app/actions/webhooks";
import Link from "next/link";
import { WebhookCreateForm } from "./WebhookCreateForm";

export default async function WebhooksSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const result = await listWebhookEndpointsAction();
  const endpoints = result.success ? result.endpoints ?? [] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhook 設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          外部サービスへの Webhook エンドポイントを管理します。
        </p>
      </div>

      {/* Endpoint list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">エンドポイント一覧</h2>
        </div>
        {endpoints.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            登録済みエンドポイントはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">URL</th>
                  <th className="px-6 py-3">Secret</th>
                  <th className="px-6 py-3">イベント数</th>
                  <th className="px-6 py-3">状態</th>
                  <th className="px-6 py-3">作成日時</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {endpoints.map((ep) => {
                  const endpointId = ep.id;
                  const newIsActive = !ep.isActive;

                  async function handleToggle() {
                    "use server";
                    await toggleWebhookEndpointAction(endpointId, newIsActive);
                  }

                  async function handleDelete() {
                    "use server";
                    await deleteWebhookEndpointAction(endpointId);
                  }

                  return (
                    <tr key={ep.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs max-w-xs truncate">{ep.url}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{ep.secret}</td>
                      <td className="px-6 py-4">{ep.events.length}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            ep.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ep.isActive ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(ep.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/settings/webhooks/${ep.id}/deliveries`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            配信ログ
                          </Link>
                          <form action={handleToggle}>
                            <button
                              type="submit"
                              className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50"
                            >
                              {ep.isActive ? "無効化" : "有効化"}
                            </button>
                          </form>
                          <form action={handleDelete}>
                            <button
                              type="submit"
                              className="text-xs text-red-600 hover:text-red-800 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50"
                            >
                              削除
                            </button>
                          </form>
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

      {/* Add endpoint form */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">エンドポイントを追加</h2>
        </div>
        <div className="px-6 py-4">
          <WebhookCreateForm />
        </div>
      </div>
    </div>
  );
}
