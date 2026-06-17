export type ApprovalStepStatus = "pending" | "approved" | "rejected";

export type ApprovalStep = {
  id: string;
  requestId: string;
  stepOrder: number;
  approverRole: string;
  status: ApprovalStepStatus;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  comment: string | null;
  organizationId: string;
  version: number;
};
