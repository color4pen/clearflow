import type { RequestStatus } from "@/domain/models/request";
import type { ApprovalStepStatus } from "@/domain/models/approvalStep";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";

export function statusLabel(status: RequestStatus): string {
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

export function statusVariant(status: RequestStatus): StatusBadgeVariant {
  const variants: Record<RequestStatus, StatusBadgeVariant> = {
    draft: "gray",
    pending: "yellow",
    approved: "green",
    rejected: "red",
    revision: "yellow",
    expired: "gray",
  };
  return variants[status];
}

export function stepStatusLabel(status: ApprovalStepStatus): string {
  const labels: Record<ApprovalStepStatus, string> = {
    pending: "審査中",
    approved: "承認済み",
    rejected: "差し戻し",
  };
  return labels[status];
}

export function stepStatusVariant(status: ApprovalStepStatus): StatusBadgeVariant {
  const variants: Record<ApprovalStepStatus, StatusBadgeVariant> = {
    pending: "yellow",
    approved: "green",
    rejected: "yellow",
  };
  return variants[status];
}

export function statusRowClass(status: RequestStatus): string {
  if (status === "pending") return "bg-bg-row-pending";
  if (status === "revision") return "bg-bg-row-revision";
  return "";
}
