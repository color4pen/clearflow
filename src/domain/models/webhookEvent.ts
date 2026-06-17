export const WEBHOOK_EVENT_TYPES = [
  "request.created",
  "request.submitted",
  "request.approved",
  "request.rejected",
  "request.revised",
  "request.resubmitted",
  "step.approved",
  "step.rejected",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export type WebhookEventData = {
  requestId: string;
  requestTitle: string;
  actorId: string;
  actorName: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

export type WebhookPayload = {
  event: WebhookEventType;
  timestamp: string;
  organizationId: string;
  data: WebhookEventData;
};
