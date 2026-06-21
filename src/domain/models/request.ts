export type RequestStatus = "draft" | "pending" | "approved" | "rejected" | "revision" | "expired";

export type Request = {
  id: string;
  title: string;
  formData: Record<string, { value: unknown; label: string }>;
  templateId: string | null;
  status: RequestStatus;
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
