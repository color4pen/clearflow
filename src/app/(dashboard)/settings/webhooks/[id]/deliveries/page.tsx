import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { listWebhookDeliveriesAction, retryWebhookDeliveryAction } from "@/app/actions/webhooks";
import Link from "next/link";
import { PageToolbar, DataTable, SectionCard } from "@/app/components";

const statusStyles = {
  delivered: "text-success text-xs font-bold",
  failed: "text-danger text-xs font-bold",
  pending: "text-warning text-xs",
};

const statusLabels = {
  delivered: "成功",
  failed: "失敗",
  pending: "処理中",
};

async function handleRetry(formData: FormData) {
  "use server";
  const deliveryId = formData.get("deliveryId") as string;
  await retryWebhookDeliveryAction(deliveryId);
}

export default async function WebhookDeliveriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const { id } = await params;
  const result = await listWebhookDeliveriesAction(id);
  const deliveries = result.success ? result.deliveries ?? [] : [];

  return (
    <div>
      {/* Toolbar */}
      <PageToolbar
        title="配信ログ"
        actions={
          <Link
            href="/settings/webhooks"
            className="text-xs text-primary underline"
          >
            ← エンドポイント一覧に戻る
          </Link>
        }
      />

      {deliveries.length === 0 ? (
        <SectionCard>
          <div className="text-center py-4 text-xs text-text-disabled">
            配信ログはありません。
          </div>
        </SectionCard>
      ) : (
        <DataTable
          columns={[
            { key: "event", header: "イベント種別", render: (d) => <>{d.event}</> },
            {
              key: "status",
              header: "ステータス",
              render: (d) => (
                <span
                  className={
                    statusStyles[d.status as keyof typeof statusStyles] ??
                    "text-text-disabled text-xs"
                  }
                >
                  {statusLabels[d.status as keyof typeof statusLabels] ?? d.status}
                </span>
              ),
            },
            { key: "statusCode", header: "HTTP ステータスコード", render: (d) => <span className="text-text">{d.statusCode ?? "—"}</span> },
            { key: "attempts", header: "試行回数", render: (d) => <span className="text-text">{d.attempts}</span> },
            {
              key: "lastAttemptAt",
              header: "最終試行日時",
              render: (d) => (
                <span className="text-text-muted">
                  {d.lastAttemptAt
                    ? new Date(d.lastAttemptAt).toLocaleString("ja-JP")
                    : "—"}
                  {d.nextRetryAt && (
                    <div className="text-xs text-revision mt-0.5">
                      次のリトライ予定: {new Date(d.nextRetryAt).toLocaleString("ja-JP")}
                    </div>
                  )}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: "作成日時",
              render: (d) => (
                <span className="text-text-muted">
                  {new Date(d.createdAt).toLocaleString("ja-JP")}
                </span>
              ),
            },
            {
              key: "actions",
              header: "操作",
              render: (d) =>
                d.status === "failed" ? (
                  <form action={handleRetry}>
                    <input type="hidden" name="deliveryId" value={d.id} />
                    <button
                      type="submit"
                      className="text-xs text-primary underline"
                    >
                      リトライ
                    </button>
                  </form>
                ) : null,
            },
          ]}
          rows={deliveries}
          rowKey={(d) => d.id}
        />
      )}
    </div>
  );
}
