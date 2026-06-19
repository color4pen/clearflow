export type TemplateField = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select";
  required: boolean;
  options?: string[];
};

export type StepCondition = {
  field: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  value: number;
};

export type ApprovalTemplateStep = {
  stepOrder: number;
  approverRole: string;
  deadlineHours?: number;
  condition?: StepCondition;
};

export type ApprovalTemplate = {
  id: string;
  name: string;
  organizationId: string;
  steps: ApprovalTemplateStep[];
  fields: TemplateField[];
  createdAt: Date;
};
