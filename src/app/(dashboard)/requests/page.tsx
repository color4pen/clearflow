import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listRequests } from "@/application/usecases";
import { bulkApproveAction } from "@/app/actions/requests";
import { BulkApprovalPanel } from "./BulkApprovalPanel";
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

export default async function RequestsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const role = session!.user.role;
  const requests = await listRequests(organizationId);

  const showBulkApproval = role !== "member";

  const boundBulkApproveAction = bulkApproveAction.bind(null);

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
        <BulkApprovalPanel
          requests={requests.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            statusText: statusLabel(r.status),
            statusClass: statusClass(r.status),
            amount: r.amount,
            createdAt: r.createdAt,
          }))}
          bulkApproveAction={boundBulkApproveAction}
          showBulkApproval={showBulkApproval}
        />
      )}
    </div>
  );
}
