import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { getRequest, getApprovalSteps } from "@/application/usecases";
import {
  submitRequestAction,
  approveRequestAction,
  rejectRequestAction,
  resubmitRequestAction,
} from "@/app/actions/requests";
import { ActionButtons } from "./ActionButtons";
import type { ServerAction } from "./ActionButtons";
import type { ApprovalStep } from "@/domain/models/approvalStep";
import { statusLabel, statusClass, stepStatusLabel, stepStatusClass } from "../statusUtils";

function formatRemainingTime(deadline: Date, now: Date): string {
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return "期限切れ";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  if (days > 0) {
    return `残り ${days}日 ${hours}時間`;
  }
  return `残り ${hours}時間`;
}

function DeadlineDisplay({ deadline }: { deadline: Date | null }) {
  if (deadline === null) return null;
  const now = new Date();
  const isExpired = deadline < now;
  if (isExpired) {
    return (
      <p className="text-xs text-red-600 font-medium">期限切れ</p>
    );
  }
  return (
    <p className="text-xs text-gray-500">{formatRemainingTime(deadline, now)}</p>
  );
}

function ApprovalStepsSection({ steps }: { steps: ApprovalStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">承認ステップ</h3>
      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-md">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
              {step.stepOrder}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">
                  {step.approverRole}
                </span>
                <span className={`text-xs ${stepStatusClass(step.status)}`}>
                  {stepStatusLabel(step.status)}
                </span>
              </div>
              {step.approvedByName && (
                <p className="text-xs text-gray-500">承認者: {step.approvedByName}</p>
              )}
              {step.approvedAt && (
                <p className="text-xs text-gray-500">
                  {step.approvedAt.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              <DeadlineDisplay deadline={step.deadline} />
              {step.comment && (
                <p className="mt-1 text-xs text-orange-700 bg-orange-50 rounded px-2 py-1">
                  差し戻しコメント: {step.comment}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
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

  const steps = await getApprovalSteps({ requestId: id, organizationId });

  const submitAction = submitRequestAction.bind(null, id) as unknown as ServerAction;
  const approveAction = approveRequestAction.bind(null, id) as unknown as ServerAction;
  const rejectAction = rejectRequestAction.bind(null, id) as unknown as ServerAction;
  const resubmitAction = resubmitRequestAction.bind(null, id) as unknown as ServerAction;

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
          <span className={`text-sm ${statusClass(request.status)}`}>
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
          <div>
            <span className="text-gray-500">金額</span>
            <p className="text-gray-900 mt-1">
              {request.amount !== null
                ? request.amount.toLocaleString("ja-JP") + "円"
                : "-"}
            </p>
          </div>
        </div>

        {/* Approval steps progress */}
        <ApprovalStepsSection steps={steps} />

        {/* Action buttons based on status */}
        <ActionButtons
          requestStatus={request.status}
          submitAction={submitAction}
          approveAction={approveAction}
          rejectAction={rejectAction}
          resubmitAction={resubmitAction}
        />
      </div>
    </div>
  );
}
