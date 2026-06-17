import type { WebhookPayload } from "./webhookEvent";

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

export type WebhookDelivery = {
  id: string;
  endpointId: string;
  event: string;
  payload: WebhookPayload;
  status: WebhookDeliveryStatus;
  statusCode: number | null;
  attempts: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
};
