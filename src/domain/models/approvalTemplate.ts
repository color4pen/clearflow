export type ApprovalTemplateStep = {
  stepOrder: number;
  approverRole: string;
  deadlineHours?: number;
};

export type ApprovalTemplate = {
  id: string;
  name: string;
  organizationId: string;
  steps: ApprovalTemplateStep[];
  minAmount: number | null;
  maxAmount: number | null;
  createdAt: Date;
};
