import type { DealPhase } from "@/domain/models/deal";
import type { OriginType } from "@/domain/models/approvalPolicy";

export type BaseDomainEvent = {
  type: string;
  organizationId: string;
  actorId: string;
  occurredAt: Date;
};

// ---------------------------------------------------------------------------
// Inquiry events
// ---------------------------------------------------------------------------

export type InquiryConverted = BaseDomainEvent & {
  type: "inquiry.converted";
  payload: { inquiryId: string; dealId: string };
};

export type InquiryDeclined = BaseDomainEvent & {
  type: "inquiry.declined";
  payload: { inquiryId: string };
};

// ---------------------------------------------------------------------------
// Deal events
// ---------------------------------------------------------------------------

export type DealPhaseChanged = BaseDomainEvent & {
  type: "deal.phase_changed";
  payload: { dealId: string; fromPhase: DealPhase; toPhase: DealPhase };
};

export type DealWon = BaseDomainEvent & {
  type: "deal.won";
  payload: { dealId: string; fromPhase: DealPhase };
};

export type DealLost = BaseDomainEvent & {
  type: "deal.lost";
  payload: { dealId: string; fromPhase: DealPhase };
};

export type DealPassed = BaseDomainEvent & {
  type: "deal.passed";
  payload: { dealId: string; fromPhase: DealPhase };
};

// ---------------------------------------------------------------------------
// Contract events
// ---------------------------------------------------------------------------

export type ContractCreated = BaseDomainEvent & {
  type: "contract.created";
  payload: { contractId: string; dealId: string; clientId: string };
};

export type ContractCompleted = BaseDomainEvent & {
  type: "contract.completed";
  payload: { contractId: string };
};

export type ContractCancelled = BaseDomainEvent & {
  type: "contract.cancelled";
  payload: { contractId: string };
};

// ---------------------------------------------------------------------------
// Invoice events
// ---------------------------------------------------------------------------

export type InvoicePaid = BaseDomainEvent & {
  type: "invoice.paid";
  payload: { invoiceId: string; contractId: string };
};

export type InvoiceOverdue = BaseDomainEvent & {
  type: "invoice.overdue";
  payload: { invoiceId: string; contractId: string };
};

// ---------------------------------------------------------------------------
// Approval request events (existing Webhook events as domain events)
// ---------------------------------------------------------------------------

export type RequestCreated = BaseDomainEvent & {
  type: "request.created";
  payload: { requestId: string; requestTitle: string; status: string };
};

export type RequestSubmitted = BaseDomainEvent & {
  type: "request.submitted";
  payload: { requestId: string; requestTitle: string; status: string };
};

export type RequestApproved = BaseDomainEvent & {
  type: "request.approved";
  payload: { requestId: string; requestTitle: string; status: string };
};

export type RequestRejected = BaseDomainEvent & {
  type: "request.rejected";
  payload: { requestId: string; requestTitle: string; status: string };
};

export type RequestRevised = BaseDomainEvent & {
  type: "request.revised";
  payload: { requestId: string; requestTitle: string; status: string };
};

export type RequestResubmitted = BaseDomainEvent & {
  type: "request.resubmitted";
  payload: { requestId: string; requestTitle: string; status: string };
};

export type StepApproved = BaseDomainEvent & {
  type: "step.approved";
  payload: {
    requestId: string;
    requestTitle: string;
    status: string;
    metadata?: Record<string, unknown>;
  };
};

export type StepRejected = BaseDomainEvent & {
  type: "step.rejected";
  payload: {
    requestId: string;
    requestTitle: string;
    status: string;
    metadata?: Record<string, unknown>;
  };
};

// ---------------------------------------------------------------------------
// Approval completion events
// ---------------------------------------------------------------------------

export type ApprovalCompleted = BaseDomainEvent & {
  type: "approval.completed";
  payload: {
    requestId: string;
    originType: OriginType;
    originTriggerAction: string | null;
    originTriggerEntityId: string | null;
  };
};

// ---------------------------------------------------------------------------
// DomainEvent union and DomainEventType
// ---------------------------------------------------------------------------

export type DomainEvent =
  | InquiryConverted
  | InquiryDeclined
  | DealPhaseChanged
  | DealWon
  | DealLost
  | DealPassed
  | ContractCreated
  | ContractCompleted
  | ContractCancelled
  | InvoicePaid
  | InvoiceOverdue
  | RequestCreated
  | RequestSubmitted
  | RequestApproved
  | RequestRejected
  | RequestRevised
  | RequestResubmitted
  | StepApproved
  | StepRejected
  | ApprovalCompleted;

export type DomainEventType = DomainEvent["type"];
