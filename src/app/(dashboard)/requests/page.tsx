import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listRequests } from "@/application/usecases";
import type { RequestStatus } from "@/domain/models/request";

function statusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    draft: "下書き",
    pending: "審査中",
    approved: "承認済み",
    rejected: "却下",
    revision: "差し戻し",
    expired: "期限切れ",
  };
  return labels[status];
}

function statusClass(status: RequestStatus): string {
  const classes: Record<RequestStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    revision: "bg-orange-100 text-orange-700",
    expired: "bg-gray-100 text-gray-500",
  };
  return classes[status];
}

function formatAmount(amount: number | null): string {
  if (amount === null) return "-";
  return amount.toLocaleString("ja-JP") + "円";
}

export default async function RequestsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const requests = await listRequests(organizationId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">申請一覧</h2>
        <Link
          href="/requests/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          新規申請
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>申請がありません</p>
          <Link
            href="/requests/new"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            最初の申請を作成する
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作成日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/requests/${request.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {request.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass(request.status)}`}
                    >
                      {statusLabel(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatAmount(request.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {request.createdAt.toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
