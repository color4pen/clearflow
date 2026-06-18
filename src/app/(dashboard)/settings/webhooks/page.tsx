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
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">Webhook 設定</span>
      </div>

      {/* Endpoint list */}
      <div className="bg-bg-surface border border-border-light mb-2">
        {endpoints.length === 0 ? (
          <div className="text-center py-4 text-xs text-text-disabled">
            登録済みエンドポイントはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-bg-table-head border border-border-table-head">
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">URL</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">Secret</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">イベント数</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">状態</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">作成日時</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">操作</th>
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
                      className={`border border-border-light hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-alt"}`}
                    >
                      <td className="px-1 py-1 text-xs max-w-xs truncate">{ep.url}</td>
                      <td className="px-1 py-1 text-xs text-text-muted">{ep.secret}</td>
                      <td className="px-1 py-1 text-xs">{ep.events.length}</td>
                      <td className="px-1 py-1 text-xs">
                        {ep.isActive ? (
                          <span className="text-success text-xs font-bold">有効</span>
                        ) : (
                          <span className="text-text-disabled text-xs">無効</span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-xs text-text-muted">
                        {new Date(ep.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-1 py-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/settings/webhooks/${ep.id}/deliveries`}
                            className="text-primary underline text-xs"
                          >
                            配信ログ
                          </Link>
                          <form action={handleToggle}>
                            <button
                              type="submit"
                              className="text-xs text-primary underline"
                            >
                              {ep.isActive ? "無効化" : "有効化"}
                            </button>
                          </form>
                          <form action={handleDelete}>
                            <button
                              type="submit"
                              className="text-xs text-danger underline"
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
      <div className="bg-bg-surface border border-border-light">
        <div className="bg-bg-toolbar border-b border-border px-2 py-1">
          <span className="text-sm font-bold text-[#333333]">エンドポイントを追加</span>
        </div>
        <div className="p-4">
          <WebhookCreateForm />
        </div>
      </div>
    </div>
  );
}
