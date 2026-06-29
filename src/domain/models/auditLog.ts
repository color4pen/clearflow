export type AuditAction =
  | "deal.create"
  | "deal.update"
  | "deal.updatePhase"
  | "deal.delete"
  | "deal_contact.create"
  | "deal_contact.delete"
  | "contract.create"
  | "contract.update"
  | "contract.updateStatus"
  | "contract.delete"
  | "invoice.create"
  | "invoice.update"
  | "invoice.update_status"
  | "meeting.create"
  | "meeting.update"
  | "action_item.create"
  | "action_item.update"
  | "action_item.delete"
  | "action_item.toggle"
  | "action_item.updateStatus"
  | "inquiry.create"
  | "inquiry.update"
  | "inquiry.updateStatus"
  | "inquiry.conversionPending"
  | "inquiry.delete"
  | "request.create"
  | "request.approve"
  | "request.reject"
  | "request.resubmit"
  | "request.expire"
  | "request.submit"
  | "approval_step.approve"
  | "approval_step.reject"
  | "delegation.create"
  | "delegation.deactivate"
  | "policy.create"
  | "policy.update"
  | "policy.activate"
  | "policy.deactivate"
  | "template.create"
  | "template.update"
  | "template.delete"
  | "revenue_target.create"
  | "revenue_target.update"
  | "revenue_target.delete"
  | "client.create"
  | "client_contact.create"
  | "client_contact.delete"
  | "user.create"
  | "user.updateRole"
  | "user.updatePassword"
  | "user.deactivate"
  | "user.reactivate"
  | "organization.update"
  | "organization.create";

export type AuditTargetType =
  | "action_item"
  | "approvalPolicy"
  | "client"
  | "client_contact"
  | "contract"
  | "deal"
  | "deal_contact"
  | "delegation"
  | "inquiry"
  | "invoice"
  | "meeting"
  | "organization"
  | "request"
  | "revenue_target"
  | "template"
  | "user";

export type AuditMetadataMap = {
  "action_item.toggle": { done: boolean };
  "action_item.updateStatus": { status: string };
  "deal.updatePhase": { fromPhase: string; toPhase: string };
  "contract.updateStatus": { fromStatus: string; toStatus: string };
  "invoice.update_status": { fromStatus: string; toStatus: string };
};

export type AuditLog = {
  id: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  actorId: string;
  organizationId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};
