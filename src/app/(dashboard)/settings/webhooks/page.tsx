import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import {
  listWebhookEndpointsAction,
  deleteWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "@/app/actions/webhooks";
import Link from "next/link";
import { WebhookCreateForm } from "./WebhookCreateForm";
import { PageToolbar, DataTable, SectionCard } from "@/app/components";

function LastDeliveryStatus({
  status,
}: {
  status: { status: string; lastAttemptAt: Date | null } | null;
}) {
  if (!status) {
    return <span className="text-text-disabled text-xs">配信なし</span>;
  }
  if (status.status === "delivered") {
    return <span className="text-success text-xs font-bold">成功</span>;
  }
  if (status.status === "failed") {
    return <span className="text-danger text-xs font-bold">失敗</span>;
  }
  if (status.status === "pending") {
    return <span className="text-warning text-xs font-bold">処理中</span>;
  }
  return <span className="text-text-muted text-xs">{status.status}</span>;
}

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
      <PageToolbar title="Webhook 設定" />

      {/* Endpoint list */}
      <div className="mb-2">
        {endpoints.length === 0 ? (
          <SectionCard>
            <div className="text-center py-4 text-xs text-text-disabled">
              登録済みエンドポイントはありません。
            </div>
          </SectionCard>
        ) : (
          <DataTable
            columns={[
              { key: "url", header: "URL", render: (ep) => <span className="max-w-xs truncate">{ep.url}</span> },
              { key: "events", header: "イベント数", render: (ep) => <>{ep.events.length}</> },
              {
                key: "isActive",
                header: "有効/無効",
                render: (ep) =>
                  ep.isActive ? (
                    <span className="text-success text-xs font-bold">有効</span>
                  ) : (
                    <span className="text-text-disabled text-xs">無効</span>
                  ),
              },
              {
                key: "lastDeliveryStatus",
                header: "直近配信状態",
                render: (ep) => (
                  <LastDeliveryStatus status={ep.lastDeliveryStatus ?? null} />
                ),
              },
              {
                key: "actions",
                header: "操作",
                render: (ep) => {
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
                  );
                },
              },
            ]}
            rows={endpoints}
            rowKey={(ep) => ep.id}
          />
        )}
      </div>

      {/* Add endpoint form */}
      <SectionCard>
        <div className="bg-bg-toolbar border-b border-border px-2 py-1">
          <span className="text-sm font-bold text-text">エンドポイントを追加</span>
        </div>
        <div className="p-4">
          <WebhookCreateForm />
        </div>
      </SectionCard>
    </div>
  );
}
