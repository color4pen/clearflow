import {
  webhookEndpointRepository,
} from "@/infrastructure/repositories";
import { deliverWebhookEvent, deliverToEndpoint } from "@/infrastructure/webhookDelivery";
import type { DomainEvent } from "@/domain/events";
import type { WebhookEventType } from "@/domain/models/webhookEvent";

// ---------------------------------------------------------------------------
// Helper: deliver a new domain event to all matching endpoints
// ---------------------------------------------------------------------------

async function deliverDomainEventToEndpoints(
  organizationId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const endpoints = await webhookEndpointRepository.findActiveByOrganizationAndEvent(
      organizationId,
      event
    );

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
    };

    await Promise.allSettled(
      endpoints.map((endpoint) =>
        deliverToEndpoint(endpoint, payload as Parameters<typeof deliverToEndpoint>[1])
      )
    );
  } catch (err) {
    console.error(`[webhookHandler] Failed to deliver domain event "${event}":`, err);
  }
}

// ---------------------------------------------------------------------------
// Async handler function for all 19 domain event types
// ---------------------------------------------------------------------------

export async function handleDomainEventWebhook(event: DomainEvent): Promise<void> {
  const { organizationId, actorId } = event;

  switch (event.type) {
    // -------------------------------------------------------------------------
    // Approval events — use deliverWebhookEvent (resolves actorName)
    // -------------------------------------------------------------------------
    case "request.created":
      await deliverWebhookEvent({
        organizationId,
        event: "request.created",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
        },
      });
      break;

    case "request.submitted":
      await deliverWebhookEvent({
        organizationId,
        event: "request.submitted",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
        },
      });
      break;

    case "request.approved":
      await deliverWebhookEvent({
        organizationId,
        event: "request.approved",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
        },
      });
      break;

    case "request.rejected":
      await deliverWebhookEvent({
        organizationId,
        event: "request.rejected",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
        },
      });
      break;

    case "request.revised":
      await deliverWebhookEvent({
        organizationId,
        event: "request.revised",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
        },
      });
      break;

    case "request.resubmitted":
      await deliverWebhookEvent({
        organizationId,
        event: "request.resubmitted",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
        },
      });
      break;

    case "step.approved":
      await deliverWebhookEvent({
        organizationId,
        event: "step.approved",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
          metadata: event.payload.metadata,
        },
      });
      break;

    case "step.rejected":
      await deliverWebhookEvent({
        organizationId,
        event: "step.rejected",
        data: {
          requestId: event.payload.requestId,
          requestTitle: event.payload.requestTitle,
          actorId,
          status: event.payload.status,
          metadata: event.payload.metadata,
        },
      });
      break;

    // -------------------------------------------------------------------------
    // New domain events — use deliverToEndpoint directly (no actorName lookup)
    // -------------------------------------------------------------------------
    case "inquiry.converted":
      await deliverDomainEventToEndpoints(organizationId, "inquiry.converted", {
        event: "inquiry.converted",
        inquiryId: event.payload.inquiryId,
        dealId: event.payload.dealId,
      });
      break;

    case "inquiry.declined":
      await deliverDomainEventToEndpoints(organizationId, "inquiry.declined", {
        event: "inquiry.declined",
        inquiryId: event.payload.inquiryId,
      });
      break;

    case "deal.phase_changed":
      await deliverDomainEventToEndpoints(organizationId, "deal.phase_changed", {
        event: "deal.phase_changed",
        dealId: event.payload.dealId,
        fromPhase: event.payload.fromPhase,
        toPhase: event.payload.toPhase,
      });
      break;

    case "deal.won":
      await deliverDomainEventToEndpoints(organizationId, "deal.won", {
        event: "deal.won",
        dealId: event.payload.dealId,
        fromPhase: event.payload.fromPhase,
      });
      break;

    case "deal.lost":
      await deliverDomainEventToEndpoints(organizationId, "deal.lost", {
        event: "deal.lost",
        dealId: event.payload.dealId,
        fromPhase: event.payload.fromPhase,
      });
      break;

    case "deal.passed":
      await deliverDomainEventToEndpoints(organizationId, "deal.passed", {
        event: "deal.passed",
        dealId: event.payload.dealId,
        fromPhase: event.payload.fromPhase,
      });
      break;

    case "contract.created":
      await deliverDomainEventToEndpoints(organizationId, "contract.created", {
        event: "contract.created",
        contractId: event.payload.contractId,
        dealId: event.payload.dealId,
        clientId: event.payload.clientId,
      });
      break;

    case "contract.completed":
      await deliverDomainEventToEndpoints(organizationId, "contract.completed", {
        event: "contract.completed",
        contractId: event.payload.contractId,
      });
      break;

    case "contract.cancelled":
      await deliverDomainEventToEndpoints(organizationId, "contract.cancelled", {
        event: "contract.cancelled",
        contractId: event.payload.contractId,
      });
      break;

    case "invoice.paid":
      await deliverDomainEventToEndpoints(organizationId, "invoice.paid", {
        event: "invoice.paid",
        invoiceId: event.payload.invoiceId,
        contractId: event.payload.contractId,
      });
      break;

    case "invoice.overdue":
      await deliverDomainEventToEndpoints(organizationId, "invoice.overdue", {
        event: "invoice.overdue",
        invoiceId: event.payload.invoiceId,
        contractId: event.payload.contractId,
      });
      break;

    case "approval.completed":
      // Internal system event — not delivered as a webhook
      break;

    default: {
      const _exhaustive: never = event;
      console.warn("[webhookHandler] Unhandled domain event type:", (_exhaustive as DomainEvent).type);
    }
  }
}
