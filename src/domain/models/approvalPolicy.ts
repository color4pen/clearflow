// TODO: ConditionOperator は approvalTemplate.ts の StepCondition.operator と同一の値域。演算子追加時の片方更新漏れリスクを避けるため、将来 src/domain/models/shared.ts へ共有型として抽出することを検討する
export type ConditionOperator = "gt" | "gte" | "lt" | "lte" | "eq";

export type OriginType = "manual" | "system";

export type ApprovalPolicy = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  triggerAction: string;
  conditionField: string | null;
  conditionOperator: ConditionOperator | null;
  conditionValue: string | null;
  templateId: string;
  isActive: boolean;
  createdAt: Date;
};
