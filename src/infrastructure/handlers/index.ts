import { dispatcher } from "@/domain/events";
import { handleDomainEventWebhook } from "./webhookHandler";
import { handleApprovalCompleted } from "./approvalCompletedHandler";
import { handleAuditLog } from "./auditLogHandler";
import type { DomainEvent } from "@/domain/events";

// ---------------------------------------------------------------------------
// Idempotency guard — prevents duplicate handler registration when this
// module is imported multiple times (e.g. hot-reload, test isolation issues).
// Uses a module-scoped flag; does NOT call dispatcher.reset() which is
// reserved for test use only.
// ---------------------------------------------------------------------------
let isRegistered = false;

export function registerHandlers(): void {
  if (isRegistered) {
    return;
  }
  isRegistered = true;

  const allEventTypes: Array<DomainEvent["type"]> = [
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
    "deal.passed",
    "contract.created",
    "contract.completed",
    "contract.cancelled",
    "invoice.paid",
    "invoice.overdue",
    "approval.completed",
  ];

  for (const eventType of allEventTypes) {
    dispatcher.on(
      eventType,
      (event) => handleDomainEventWebhook(event as DomainEvent),
      "async"
    );
  }

  dispatcher.on("approval.completed", handleApprovalCompleted, "async");
  dispatcher.on("request.submitted", handleAuditLog, "sync");
}
