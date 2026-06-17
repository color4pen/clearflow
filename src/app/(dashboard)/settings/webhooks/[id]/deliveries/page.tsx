import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { listWebhookDeliveriesAction } from "@/app/actions/webhooks";
import Link from "next/link";

const statusColors = {
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  delivered: "成功",
  failed: "失敗",
  pending: "処理中",
};

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配信ログ</h1>
          <p className="mt-1 text-sm text-gray-500">Webhook 配信の履歴を表示します。</p>
        </div>
        <Link
          href="/settings/webhooks"
          className="text-sm text-blue-600 hover:underline"
        >
          ← エンドポイント一覧に戻る
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {deliveries.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            配信ログはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">イベント種別</th>
                  <th className="px-6 py-3">ステータス</th>
                  <th className="px-6 py-3">HTTP ステータスコード</th>
                  <th className="px-6 py-3">試行回数</th>
                  <th className="px-6 py-3">最終試行日時</th>
                  <th className="px-6 py-3">作成日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{delivery.event}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          statusColors[delivery.status as keyof typeof statusColors] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabels[delivery.status as keyof typeof statusLabels] ?? delivery.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {delivery.statusCode ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{delivery.attempts}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {delivery.lastAttemptAt
                        ? new Date(delivery.lastAttemptAt).toLocaleString("ja-JP")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(delivery.createdAt).toLocaleString("ja-JP")}
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
