import type { RequestStatus } from "@/domain/models/request";
import type { ApprovalStepStatus } from "@/domain/models/approvalStep";

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

export function statusClass(status: RequestStatus): string {
  const classes: Record<RequestStatus, string> = {
    draft: "text-[#2980b9]",
    pending: "text-[#d4880f] font-bold",
    approved: "text-[#1a8a4a]",
    rejected: "text-[#c0392b]",
    revision: "text-[#d35400] font-bold",
    expired: "text-[#999999]",
  };
  return classes[status];
}

export function stepStatusLabel(status: ApprovalStepStatus): string {
  const labels: Record<ApprovalStepStatus, string> = {
    pending: "審査中",
    approved: "承認済み",
    rejected: "差し戻し",
  };
  return labels[status];
}

export function stepStatusClass(status: ApprovalStepStatus): string {
  const classes: Record<ApprovalStepStatus, string> = {
    pending: "text-amber-700 font-medium",
    approved: "text-emerald-700 font-medium",
    rejected: "text-orange-600 font-medium",
  };
  return classes[status];
}

export function statusRowClass(status: RequestStatus): string {
  if (status === "pending") return "bg-amber-50";
  if (status === "revision") return "bg-orange-50";
  return "";
}
