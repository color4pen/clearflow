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
    <div>
      {/* Toolbar */}
      <div className="bg-[#f5f5f5] border border-[#cccccc] px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">Webhook 設定</span>
      </div>

      {/* Endpoint list */}
      <div className="bg-white border border-[#e0e0e0] mb-2">
        {endpoints.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#95a5a6]">
            登録済みエンドポイントはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#dcdde1] border border-[#bdc3c7]">
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">URL</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">Secret</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">イベント数</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">状態</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">作成日時</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, index) => {
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
                    <tr
                      key={ep.id}
                      className={`border border-[#e0e0e0] hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}`}
                    >
                      <td className="px-1 py-1 text-xs max-w-xs truncate">{ep.url}</td>
                      <td className="px-1 py-1 text-xs text-[#7f8c8d]">{ep.secret}</td>
                      <td className="px-1 py-1 text-xs">{ep.events.length}</td>
                      <td className="px-1 py-1 text-xs">
                        {ep.isActive ? (
                          <span className="text-[#1a8a4a] text-xs font-bold">有効</span>
                        ) : (
                          <span className="text-[#95a5a6] text-xs">無効</span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-xs text-[#7f8c8d]">
                        {new Date(ep.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-1 py-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/settings/webhooks/${ep.id}/deliveries`}
                            className="text-[#2980b9] underline text-xs"
                          >
                            配信ログ
                          </Link>
                          <form action={handleToggle}>
                            <button
                              type="submit"
                              className="text-xs text-[#2980b9] underline"
                            >
                              {ep.isActive ? "無効化" : "有効化"}
                            </button>
                          </form>
                          <form action={handleDelete}>
                            <button
                              type="submit"
                              className="text-xs text-[#c0392b] underline"
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
      <div className="bg-white border border-[#e0e0e0]">
        <div className="bg-[#f5f5f5] border-b border-[#cccccc] px-2 py-1">
          <span className="text-sm font-bold text-[#333333]">エンドポイントを追加</span>
        </div>
        <div className="p-4">
          <WebhookCreateForm />
        </div>
      </div>
    </div>
  );
}
