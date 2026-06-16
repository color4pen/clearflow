import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { getRequest } from "@/application/usecases";
import {
  submitRequestAction,
  approveRequestAction,
  rejectRequestAction,
} from "@/app/actions/requests";
import type { RequestStatus } from "@/domain/models/request";

function statusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    draft: "下書き",
    pending: "審査中",
    approved: "承認済み",
    rejected: "却下",
  };
  return labels[status];
}

function statusClass(status: RequestStatus): string {
  const classes: Record<RequestStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return classes[status];
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const request = await getRequest(id, organizationId);
  if (!request) {
    notFound();
  }

  const submitAction = submitRequestAction.bind(null, id) as unknown as (
    formData: FormData
  ) => Promise<void>;
  const approveAction = approveRequestAction.bind(null, id) as unknown as (
    formData: FormData
  ) => Promise<void>;
  const rejectAction = rejectRequestAction.bind(null, id) as unknown as (
    formData: FormData
  ) => Promise<void>;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/requests"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← 申請一覧に戻る
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{request.title}</h2>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusClass(request.status)}`}
          >
            {statusLabel(request.status)}
          </span>
        </div>

        {request.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">説明</h3>
            <p className="text-gray-600 whitespace-pre-wrap">
              {request.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-gray-500">作成日時</span>
            <p className="text-gray-900 mt-1">
              {request.createdAt.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <span className="text-gray-500">更新日時</span>
            <p className="text-gray-900 mt-1">
              {request.updatedAt.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Action buttons based on status */}
        {request.status === "draft" && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              アクション
            </h3>
            <form action={submitAction}>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                提出する（審査へ）
              </button>
            </form>
          </div>
        )}

        {request.status === "pending" && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              アクション
            </h3>
            <div className="flex gap-3">
              <form action={approveAction}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  承認する
                </button>
              </form>
              <form action={rejectAction}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  却下する
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
