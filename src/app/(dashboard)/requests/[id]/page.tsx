import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import {
  getRequest,
  getApprovalSteps,
  listOrganizationUsers,
  getActiveDelegationsForUser,
} from "@/application/usecases";
import {
  submitRequestAction,
  approveRequestAction,
  rejectRequestAction,
  resubmitRequestAction,
} from "@/app/actions/requests";
import { ActionButtons } from "./ActionButtons";
import { ApprovalStepper } from "./ApprovalStepper";
import { SystemOriginBanner } from "./SystemOriginBanner";
import { statusLabel, statusVariant } from "../statusUtils";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import { SectionCard } from "@/app/components";
import { getCurrentStep, canApproveWithDelegation } from "@/domain/services/approvalStepService";

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const userId = session!.user.id;
  const role = session!.user.role;

  const [request, steps, orgUsers, delegations] = await Promise.all([
    getRequest(id, organizationId),
    getApprovalSteps({ requestId: id, organizationId }),
    listOrganizationUsers({ organizationId }),
    getActiveDelegationsForUser({ userId, organizationId }),
  ]);

  if (!request) {
    notFound();
  }

  const userNameMap = new Map(orgUsers.map((u) => [u.id, u.name]));
  const creatorName = userNameMap.get(request.creatorId) ?? request.creatorId.slice(0, 8);

  // Determine current step and whether this user can approve
  const currentStep = getCurrentStep(steps);
  const isCurrentApprover =
    request.status === "pending" && currentStep !== null
      ? canApproveWithDelegation(currentStep, role, delegations).allowed
      : false;

  const submitAction = submitRequestAction.bind(null, id);
  const approveAction = approveRequestAction.bind(null, id);
  const rejectAction = rejectRequestAction.bind(null, id);
  const resubmitAction = resubmitRequestAction.bind(null, id);

  const formDataEntries = Object.entries(request.formData);

  return (
    <div>
      <div className="mb-2">
        <Link href="/requests" className="text-xs text-primary underline">
          ← 申請一覧に戻る
        </Link>
      </div>

      <SectionCard>
        {/* Header section */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-base font-bold text-text flex-1 min-w-0">
              {request.title}
            </h1>
            <StatusBadge variant={statusVariant(request.status)} className="flex-shrink-0">
              {statusLabel(request.status)}
            </StatusBadge>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted flex-wrap">
            <span>申請者: {creatorName}</span>
            <span>申請日時: {formatDateTime(request.createdAt)}</span>
          </div>
        </div>

        <div className="p-4">
          {/* System origin banner */}
          <SystemOriginBanner
            originType={request.originType}
            originTriggerAction={request.originTriggerAction}
            originTriggerEntityId={request.originTriggerEntityId}
            organizationId={organizationId}
          />

          {/* Form data section */}
          {formDataEntries.length > 0 && (
            <div className="mb-4 space-y-2">
              {formDataEntries.map(([key, entry]) => (
                <div key={key}>
                  <span className="text-xs text-text-muted">{entry.label}</span>
                  <p className="text-xs text-text mt-0.5">
                    {typeof entry.value === "number"
                      ? entry.value.toLocaleString("ja-JP")
                      : String(entry.value ?? "")}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-text-muted">更新日時</span>
              <p className="text-xs text-text mt-0.5">{formatDateTime(request.updatedAt)}</p>
            </div>
          </div>

          {/* Approval stepper */}
          <ApprovalStepper steps={steps} currentStepId={currentStep?.id ?? null} />

          {/* Action buttons */}
          <ActionButtons
            requestStatus={request.status}
            isCurrentApprover={isCurrentApprover}
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

