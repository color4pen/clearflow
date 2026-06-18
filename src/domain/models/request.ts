export type RequestStatus = "draft" | "pending" | "approved" | "rejected" | "revision" | "expired";

export type Request = {
  id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  amount: number | null;
  organizationId: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type ApprovalStepSummary = {
  approverRole: string;
  status: "pending" | "approved" | "rejected";
  deadline: Date | null;
};

export type RequestWithSteps = Request & {
  approvalSteps: ApprovalStepSummary[];
};
