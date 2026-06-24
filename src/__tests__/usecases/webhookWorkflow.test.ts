/**
 * Webhook workflow tests — static code analysis
 *
 * Verifies webhook-related implementation via source file inspection:
 * - Domain model definitions
 * - Delivery service structure
 * - Usecase integration (dispatcher-based, tx-internal dispatch + post-tx flush)
 * - Access control
 * - Tenant isolation
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// Domain model — event types
// ---------------------------------------------------------------------------

describe("Webhook domain model", () => {
  it("webhookEvent.ts has WEBHOOK_EVENT_TYPES with 18 elements", async () => {
    const src = await readSrc("domain/models/webhookEvent.ts");
    expect(src).toContain("WEBHOOK_EVENT_TYPES");

    const match = src.match(/WEBHOOK_EVENT_TYPES\s*=\s*\[([^\]]+)\]/s);
    expect(match).not.toBeNull();
    const elements = match![1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    expect(elements.length).toBe(18);
  });

  it("webhookEvent.ts exports WebhookEventType", async () => {
    const src = await readSrc("domain/models/webhookEvent.ts");
    expect(src).toContain("WebhookEventType");
    expect(src).toContain("export");
  });

  it("webhookEvent.ts contains all 8 original approval event types", async () => {
    const src = await readSrc("domain/models/webhookEvent.ts");
    const expectedEvents = [
      "request.created",
      "request.submitted",
      "request.approved",
      "request.rejected",
      "request.revised",
      "request.resubmitted",
      "step.approved",
      "step.rejected",
    ];
    for (const event of expectedEvents) {
      expect(src).toContain(event);
    }
  });

  it("webhookEvent.ts contains all 10 new domain event types", async () => {
    const src = await readSrc("domain/models/webhookEvent.ts");
    const newEvents = [
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
    ];
    for (const event of newEvents) {
      expect(src).toContain(event);
    }
  });
});

// ---------------------------------------------------------------------------
// Webhook delivery service
// ---------------------------------------------------------------------------

describe("Webhook delivery service", () => {
  it("webhookDelivery.ts exports computeSignature function", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("computeSignature");
    expect(src).toContain("export");
  });

  it("webhookDelivery.ts exports deliverWebhookEvent function", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("deliverWebhookEvent");
    expect(src).toContain("export");
  });

  it("webhookDelivery.ts exports deliverToEndpoint function", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("export async function deliverToEndpoint");
  });

  it("webhookDelivery.ts uses fetch for HTTP delivery", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("fetch");
  });

  it("webhookDelivery.ts includes X-Clearflow-Signature header", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("X-Clearflow-Signature");
  });

  it("webhookDelivery.ts uses AbortSignal.timeout for 5-second timeout", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("AbortSignal.timeout");
    expect(src).toContain("5000");
  });

  it("webhookDelivery.ts uses sha256= prefix for signature header", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("sha256=");
  });
});

// ---------------------------------------------------------------------------
// Usecase integration — dispatcher-based event dispatch
// ---------------------------------------------------------------------------

const usecaseFiles = [
  "application/usecases/createRequest.ts",
  "application/usecases/submitRequest.ts",
  "application/usecases/approveRequest.ts",
  "application/usecases/rejectRequest.ts",
  "application/usecases/resubmitRequest.ts",
];

describe("Usecase integration — dispatcher pattern", () => {
  for (const file of usecaseFiles) {
    it(`${file} uses dispatcher.dispatch (not deliverWebhookEvent directly)`, async () => {
      const src = await readSrc(file);
      expect(src).toContain("dispatcher.dispatch");
      expect(src).not.toContain("deliverWebhookEvent");
    });

    it(`${file} calls dispatcher.flushAsync`, async () => {
      const src = await readSrc(file);
      expect(src).toContain("dispatcher.flushAsync");
    });

    it(`${file} wraps body in dispatcher.runInContext`, async () => {
      const src = await readSrc(file);
      expect(src).toContain("dispatcher.runInContext");
    });

    it(`${file} calls dispatcher.dispatch before dispatcher.flushAsync`, async () => {
      const src = await readSrc(file);
      // At least one dispatcher.dispatch exists
      const dispatchIdx = src.lastIndexOf("dispatcher.dispatch");
      expect(dispatchIdx).toBeGreaterThan(-1);

      // dispatcher.flushAsync appears after all dispatcher.dispatch calls
      const flushIdx = src.lastIndexOf("dispatcher.flushAsync");
      expect(flushIdx).toBeGreaterThan(-1);
      expect(flushIdx).toBeGreaterThan(dispatchIdx);
    });

    it(`${file} calls dispatcher.flushAsync after db.transaction`, async () => {
      const src = await readSrc(file);
      // flushAsync must appear after the last db.transaction keyword
      const txIdx = src.lastIndexOf("db.transaction");
      expect(txIdx).toBeGreaterThan(-1);

      const flushIdx = src.lastIndexOf("dispatcher.flushAsync");
      expect(flushIdx).toBeGreaterThan(-1);
      expect(flushIdx).toBeGreaterThan(txIdx);
    });
  }
});

// ---------------------------------------------------------------------------
// Specific event types per usecase
// ---------------------------------------------------------------------------

describe("Usecase event types", () => {
  it('createRequest dispatches "request.created"', async () => {
    const src = await readSrc("application/usecases/createRequest.ts");
    expect(src).toContain('"request.created"');
  });

  it('submitRequest dispatches "request.submitted"', async () => {
    const src = await readSrc("application/usecases/submitRequest.ts");
    expect(src).toContain('"request.submitted"');
  });

  it('approveRequest dispatches "step.approved" and "request.approved"', async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain('"step.approved"');
    expect(src).toContain('"request.approved"');
  });

  it('rejectRequest (revision) dispatches "request.revised" and "step.rejected"', async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain('"request.revised"');
    expect(src).toContain('"step.rejected"');
  });

  it('rejectRequest (rejected) dispatches "request.rejected"', async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain('"request.rejected"');
  });

  it('resubmitRequest dispatches "request.resubmitted"', async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    expect(src).toContain('"request.resubmitted"');
  });
});

// ---------------------------------------------------------------------------
// New domain event usecases
// ---------------------------------------------------------------------------

describe("New domain event usecases", () => {
  it('updateInquiryStatus dispatches "inquiry.converted" on converted transition', async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain('"inquiry.converted"');
    expect(src).toContain("dispatcher.dispatch");
  });

  it('updateInquiryStatus dispatches "inquiry.declined" on declined transition', async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain('"inquiry.declined"');
  });

  it('updateDealPhase dispatches "deal.won" on won transition', async () => {
    const src = await readSrc("application/usecases/updateDealPhase.ts");
    expect(src).toContain('"deal.won"');
    expect(src).toContain("dispatcher.dispatch");
  });

  it('updateDealPhase dispatches "deal.lost" on lost transition', async () => {
    const src = await readSrc("application/usecases/updateDealPhase.ts");
    expect(src).toContain('"deal.lost"');
  });

  it('updateDealPhase dispatches "deal.phase_changed" for other transitions', async () => {
    const src = await readSrc("application/usecases/updateDealPhase.ts");
    expect(src).toContain('"deal.phase_changed"');
  });

  it('createContract dispatches "contract.created"', async () => {
    const src = await readSrc("application/usecases/createContract.ts");
    expect(src).toContain('"contract.created"');
    expect(src).toContain("dispatcher.dispatch");
  });

  it('updateContractStatus dispatches "contract.completed" and "contract.cancelled"', async () => {
    const src = await readSrc("application/usecases/updateContractStatus.ts");
    expect(src).toContain('"contract.completed"');
    expect(src).toContain('"contract.cancelled"');
    expect(src).toContain("dispatcher.dispatch");
  });

  it('updateInvoiceStatus dispatches "invoice.paid" and "invoice.overdue"', async () => {
    const src = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(src).toContain('"invoice.paid"');
    expect(src).toContain('"invoice.overdue"');
    expect(src).toContain("dispatcher.dispatch");
  });
});

// ---------------------------------------------------------------------------
// Access control — webhooks.ts action file
// ---------------------------------------------------------------------------

describe("Webhook access control (T-12)", () => {
  it('webhooks.ts has "use server" directive', async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    expect(src.trimStart().startsWith('"use server"')).toBe(true);
  });

  it("webhooks.ts checks session.user.role", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    expect(src).toContain("session.user.role");
  });

  it('webhooks.ts uses canPerform for role guard', async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    expect(src).toContain('canPerform');
    expect(src).toContain('manageWebhooks');
  });

  it('webhooks.ts returns "権限がありません" for non-admin', async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    expect(src).toContain("権限がありません");
  });

  it("webhooks.ts reads organizationId from session (not formData)", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    expect(src).toContain("session.user.organizationId");
    expect(src).not.toContain('formData.get("organizationId")');
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — repository files
// ---------------------------------------------------------------------------

describe("Tenant isolation in repositories", () => {
  it("webhookEndpointRepository uses organizationId in findByOrganization", async () => {
    const src = await readSrc(
      "infrastructure/repositories/webhookEndpointRepository.ts"
    );
    const fnIdx = src.indexOf("findByOrganization");
    expect(fnIdx).toBeGreaterThan(-1);
    const orgIdx = src.indexOf("organizationId", fnIdx);
    expect(orgIdx).toBeGreaterThan(-1);
  });

  it("webhookEndpointRepository uses organizationId in findActiveByOrganizationAndEvent", async () => {
    const src = await readSrc(
      "infrastructure/repositories/webhookEndpointRepository.ts"
    );
    const fnIdx = src.indexOf("findActiveByOrganizationAndEvent");
    expect(fnIdx).toBeGreaterThan(-1);
    const orgIdx = src.indexOf("organizationId", fnIdx);
    expect(orgIdx).toBeGreaterThan(-1);
  });

  it("webhookEndpointRepository uses organizationId in updateIsActive", async () => {
    const src = await readSrc(
      "infrastructure/repositories/webhookEndpointRepository.ts"
    );
    const fnIdx = src.indexOf("updateIsActive");
    expect(fnIdx).toBeGreaterThan(-1);
    const orgIdx = src.indexOf("organizationId", fnIdx);
    expect(orgIdx).toBeGreaterThan(-1);
  });

  it("webhookEndpointRepository uses organizationId in deleteById", async () => {
    const src = await readSrc(
      "infrastructure/repositories/webhookEndpointRepository.ts"
    );
    const fnIdx = src.indexOf("deleteById");
    expect(fnIdx).toBeGreaterThan(-1);
    const orgIdx = src.indexOf("organizationId", fnIdx);
    expect(orgIdx).toBeGreaterThan(-1);
  });

  it("webhookDeliveryRepository verifies organizationId in findByEndpointId", async () => {
    const src = await readSrc(
      "infrastructure/repositories/webhookDeliveryRepository.ts"
    );
    const fnIdx = src.indexOf("findByEndpointId");
    expect(fnIdx).toBeGreaterThan(-1);
    const orgIdx = src.indexOf("organizationId", fnIdx);
    expect(orgIdx).toBeGreaterThan(-1);
  });
});
