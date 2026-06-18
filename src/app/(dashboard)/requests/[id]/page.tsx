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
      <span className="text-xs text-[#c0392b] font-bold">期限切れ</span>
    );
  }
  return (
    <span className="text-xs text-[#7f8c8d]">{formatRemainingTime(deadline, now)}</span>
  );
}

function ApprovalStepsSection({ steps }: { steps: ApprovalStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-[#2c3e50] mb-2">承認ステップ</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#dcdde1] border border-[#bdc3c7]">
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">No.</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">承認者ロール</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">ステータス</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">承認者名</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">処理日時</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">期限</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">コメント</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, index) => (
              <tr
                key={step.id}
                className={`border border-[#e0e0e0] ${index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}`}
              >
                <td className="px-1 py-1 text-xs text-[#2c3e50]">{step.stepOrder}</td>
                <td className="px-1 py-1 text-xs text-[#2c3e50]">{step.approverRole}</td>
                <td className={`px-1 py-1 text-xs ${stepStatusClass(step.status)}`}>
                  {stepStatusLabel(step.status)}
                </td>
                <td className="px-1 py-1 text-xs text-[#2c3e50]">
                  {step.approvedByName ?? "—"}
                </td>
                <td className="px-1 py-1 text-xs text-[#7f8c8d]">
                  {step.approvedAt
                    ? step.approvedAt.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-1 py-1 text-xs">
                  <DeadlineDisplay deadline={step.deadline} />
                </td>
                <td className="px-1 py-1 text-xs text-[#d35400]">
                  {step.comment ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <div className="mb-2">
        <Link
          href="/requests"
          className="text-xs text-[#2980b9] underline"
        >
          ← 申請一覧に戻る
        </Link>
      </div>

      <div className="bg-white border border-[#e0e0e0]">
        {/* Toolbar */}
        <div className="bg-[#f5f5f5] border border-[#cccccc] px-2 py-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#333333]">{request.title}</h2>
          <span className={`text-xs ${statusClass(request.status)}`}>
            {statusLabel(request.status)}
          </span>
        </div>

        <div className="p-4">
          {request.description && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-[#2c3e50] mb-1">説明</h3>
              <p className="text-xs text-[#2c3e50] whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-[#7f8c8d]">作成日時</span>
              <p className="text-xs text-[#2c3e50] mt-0.5">
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
              <span className="text-xs text-[#7f8c8d]">更新日時</span>
              <p className="text-xs text-[#2c3e50] mt-0.5">
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
              <span className="text-xs text-[#7f8c8d]">金額</span>
              <p className="text-xs text-[#2c3e50] mt-0.5">
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
    </div>
  );
}
