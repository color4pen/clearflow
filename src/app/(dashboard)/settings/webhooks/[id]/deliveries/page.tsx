import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { listWebhookDeliveriesAction, retryWebhookDeliveryAction } from "@/app/actions/webhooks";
import Link from "next/link";

const statusStyles = {
  delivered: "text-[#1a8a4a] text-xs font-bold",
  failed: "text-[#c0392b] text-xs font-bold",
  pending: "text-[#d4880f] text-xs",
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
      <div className="bg-[#f5f5f5] border border-[#cccccc] px-2 py-1 mb-0 flex items-center justify-between">
        <span className="text-sm font-bold text-[#333333]">配信ログ</span>
        <Link
          href="/settings/webhooks"
          className="text-xs text-[#2980b9] underline"
        >
          ← エンドポイント一覧に戻る
        </Link>
      </div>

      <div className="bg-white border border-[#e0e0e0]">
        {deliveries.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#95a5a6]">
            配信ログはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#dcdde1] border border-[#bdc3c7]">
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">イベント種別</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">ステータス</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">HTTP ステータスコード</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">試行回数</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">最終試行日時</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">作成日時</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery, index) => (
                  <tr
                    key={delivery.id}
                    className={`border border-[#e0e0e0] hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}`}
                  >
                    <td className="px-1 py-1 text-xs">{delivery.event}</td>
                    <td className="px-1 py-1 text-xs">
                      <span
                        className={
                          statusStyles[delivery.status as keyof typeof statusStyles] ??
                          "text-[#95a5a6] text-xs"
                        }
                      >
                        {statusLabels[delivery.status as keyof typeof statusLabels] ?? delivery.status}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-xs text-[#2c3e50]">
                      {delivery.statusCode ?? "—"}
                    </td>
                    <td className="px-1 py-1 text-xs text-[#2c3e50]">{delivery.attempts}</td>
                    <td className="px-1 py-1 text-xs text-[#7f8c8d]">
                      {delivery.lastAttemptAt
                        ? new Date(delivery.lastAttemptAt).toLocaleString("ja-JP")
                        : "—"}
                      {delivery.nextRetryAt && (
                        <div className="text-xs text-[#d35400] mt-0.5">
                          次のリトライ予定: {new Date(delivery.nextRetryAt).toLocaleString("ja-JP")}
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-1 text-xs text-[#7f8c8d]">
                      {new Date(delivery.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-1 py-1 text-xs">
                      {delivery.status === "failed" && (
                        <form action={handleRetry}>
                          <input type="hidden" name="deliveryId" value={delivery.id} />
                          <button
                            type="submit"
                            className="text-xs text-[#2980b9] underline"
                          >
                            リトライ
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
