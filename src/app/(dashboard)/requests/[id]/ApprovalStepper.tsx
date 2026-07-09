import type { ApprovalStep } from "@/domain/models/approvalStep";
import { stepStatusVariant } from "@/app/(dashboard)/requests/statusUtils";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";

type Props = {
  steps: ApprovalStep[];
  currentStepId: string | null;
};

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
    return <span className="text-[10px] text-danger font-bold ml-1">期限切れ</span>;
  }
  return (
    <span className="text-[10px] text-text-muted ml-1">
      {formatRemainingTime(deadline, now)}
    </span>
  );
}

function StepIcon({
  status,
  isCurrent,
}: {
  status: string;
  isCurrent: boolean;
}) {
  if (status === "approved") {
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-status-green-text flex items-center justify-center">
        <span className="text-white text-xs font-bold">✓</span>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-status-red-text flex items-center justify-center">
        <span className="text-white text-xs font-bold">✕</span>
      </div>
    );
  }
  if (isCurrent) {
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-primary bg-bg-surface flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-primary block" />
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-border bg-bg-surface flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-border block" />
    </div>
  );
}

function ConnectorLine({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div className="flex justify-center w-7 flex-shrink-0">
      <div
        className={`w-0.5 h-6 ${isCompleted ? "bg-status-green-text/70" : "bg-border"}`}
      />
    </div>
  );
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stepStatusLabel(status: string): string {
  if (status === "approved") return "承認済み";
  if (status === "rejected") return "却下";
  return "審査中";
}

export function ApprovalStepper({ steps, currentStepId }: Props) {
  if (steps.length === 0) return null;

  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-text mb-3">承認ステップ</h3>
      <div className="pl-2">
        {sorted.map((step, idx) => {
          const isCurrent = step.id === currentStepId;
          const isLast = idx === sorted.length - 1;
          const connectorCompleted = step.status === "approved";

          return (
            <div key={step.id}>
              {/* Step row */}
              <div
                className={[
                  "flex items-start gap-3 rounded-lg p-2",
                  isCurrent ? "bg-status-blue-bg border border-status-blue-bg" : "",
                ].join(" ")}
              >
                <StepIcon status={step.status} isCurrent={isCurrent} />
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-text">
                      {step.name ?? step.approverRole}
                    </span>
                    <StatusBadge variant={stepStatusVariant(step.status)}>
                      {stepStatusLabel(step.status)}
                    </StatusBadge>
                  </div>
                  {step.approvedByName && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      承認者: {step.approvedByName}
                    </p>
                  )}
                  {step.approvedAt && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatDateTime(step.approvedAt)}
                    </p>
                  )}
                  {step.deadline && step.status === "pending" && (
                    <p className="text-xs mt-0.5">
                      期限: <DeadlineDisplay deadline={step.deadline} />
                    </p>
                  )}
                  {step.comment && (
                    <p className="text-xs text-text-secondary mt-1 bg-bg-surface border border-border-light rounded px-2 py-1">
                      {step.comment}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector to next step */}
              {!isLast && (
                <div className="ml-2 my-0.5">
                  <ConnectorLine isCompleted={connectorCompleted} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
