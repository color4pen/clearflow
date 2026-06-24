export const WEBHOOK_EVENT_TYPES = [
  "request.created",
  "request.submitted",
  "request.approved",
  "request.rejected",
  "request.revised",
  "request.resubmitted",
  "step.approved",
  "step.rejected",
  "inquiry.converted",
  "inquiry.declined",
  "deal.phase_changed",
  "deal.won",
  "deal.lost",
  "contract.created",
  "contract.completed",
  "contract.cancelled",
  "invoice.paid",
  "invoice.overdue",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Payload for approval-related events (request.*, step.*) */
export type WebhookEventData = {
  requestId: string;
  requestTitle: string;
  actorId: string;
  actorName: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

/** Payload sub-types for new domain events */
export type InquiryConvertedWebhookData = {
  event: "inquiry.converted";
  inquiryId: string;
  dealId: string;
};

export type InquiryDeclinedWebhookData = {
  event: "inquiry.declined";
  inquiryId: string;
};

export type DealPhaseChangedWebhookData = {
  event: "deal.phase_changed";
  dealId: string;
  fromPhase: string;
  toPhase: string;
};

export type DealWonWebhookData = {
  event: "deal.won";
  dealId: string;
  fromPhase: string;
};

export type DealLostWebhookData = {
  event: "deal.lost";
  dealId: string;
  fromPhase: string;
};

export type ContractCreatedWebhookData = {
  event: "contract.created";
  contractId: string;
  dealId: string;
  clientId: string;
};

export type ContractCompletedWebhookData = {
  event: "contract.completed";
  contractId: string;
};

export type ContractCancelledWebhookData = {
  event: "contract.cancelled";
  contractId: string;
};

export type InvoicePaidWebhookData = {
  event: "invoice.paid";
  invoiceId: string;
  contractId: string;
};

export type InvoiceOverdueWebhookData = {
  event: "invoice.overdue";
  invoiceId: string;
  contractId: string;
};

/** Union of all new domain event webhook payloads */
export type DomainEventWebhookData =
  | InquiryConvertedWebhookData
  | InquiryDeclinedWebhookData
  | DealPhaseChangedWebhookData
  | DealWonWebhookData
  | DealLostWebhookData
  | ContractCreatedWebhookData
  | ContractCompletedWebhookData
  | ContractCancelledWebhookData
  | InvoicePaidWebhookData
  | InvoiceOverdueWebhookData;

export type WebhookPayload = {
  event: WebhookEventType;
  timestamp: string;
  organizationId: string;
  data: WebhookEventData | DomainEventWebhookData;
};
