import type { WebhookEventType } from "./webhookEvent";

export type WebhookEndpoint = {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  isActive: boolean;
  events: WebhookEventType[];
  createdAt: Date;
  updatedAt: Date;
};
