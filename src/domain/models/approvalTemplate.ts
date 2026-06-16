export type ApprovalTemplateStep = {
  stepOrder: number;
  approverRole: string;
};

export type ApprovalTemplate = {
  id: string;
  name: string;
  organizationId: string;
  steps: ApprovalTemplateStep[];
  createdAt: Date;
};
