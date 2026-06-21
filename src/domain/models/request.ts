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
  // 承認リクエストの発生元
  sourceType: string | null;
  sourceId: string | null;
};

export type ApprovalStepSummary = {
  approverRole: string;
  status: "pending" | "approved" | "rejected";
  deadline: Date | null;
};

export type RequestWithSteps = Request & {
  approvalSteps: ApprovalStepSummary[];
};
