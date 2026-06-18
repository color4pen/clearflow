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
import { PageToolbar, DataTable, SectionCard } from "@/app/components";

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
      <span className="text-xs text-danger font-bold">期限切れ</span>
    );
  }
  return (
    <span className="text-xs text-text-muted">{formatRemainingTime(deadline, now)}</span>
  );
}

function ApprovalStepsSection({ steps }: { steps: ApprovalStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-text mb-2">承認ステップ</h3>
      <div className="overflow-x-auto">
        <DataTable
          columns={[
            { key: "stepOrder", header: "No.", render: (step) => <span className="text-text">{step.stepOrder}</span> },
            { key: "approverRole", header: "承認者ロール", render: (step) => <span className="text-text">{step.approverRole}</span> },
            { key: "status", header: "ステータス", render: (step) => <span className={stepStatusClass(step.status)}>{stepStatusLabel(step.status)}</span> },
            { key: "approvedByName", header: "承認者名", render: (step) => <span className="text-text">{step.approvedByName ?? "—"}</span> },
            {
              key: "approvedAt",
              header: "処理日時",
              render: (step) => (
                <span className="text-text-muted">
                  {step.approvedAt
                    ? step.approvedAt.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              ),
            },
            { key: "deadline", header: "期限", render: (step) => <DeadlineDisplay deadline={step.deadline} /> },
            { key: "comment", header: "コメント", render: (step) => <span className="text-revision">{step.comment ?? ""}</span> },
          ]}
          rows={steps}
          rowKey={(step) => step.id}
        />
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
          className="text-xs text-primary underline"
        >
          ← 申請一覧に戻る
        </Link>
      </div>

      <SectionCard>
        {/* Toolbar */}
        <PageToolbar
          title={request.title}
          actions={
            <span className={`text-xs ${statusClass(request.status)}`}>
              {statusLabel(request.status)}
            </span>
          }
        />

        <div className="p-4">
          {request.description && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-text mb-1">説明</h3>
              <p className="text-xs text-text whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-text-muted">作成日時</span>
              <p className="text-xs text-text mt-0.5">
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
              <span className="text-xs text-text-muted">更新日時</span>
              <p className="text-xs text-text mt-0.5">
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
              <span className="text-xs text-text-muted">金額</span>
              <p className="text-xs text-text mt-0.5">
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
      </SectionCard>
    </div>
  );
}
