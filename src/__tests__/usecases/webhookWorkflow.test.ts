/**
 * Webhook workflow tests — static code analysis
 *
 * Verifies webhook-related implementation via source file inspection:
 * - Domain model definitions
 * - Delivery service structure
 * - Usecase integration (fire-and-forget, tx-external)
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
  it("webhookEvent.ts has WEBHOOK_EVENT_TYPES with 8 elements", async () => {
    const src = await readSrc("domain/models/webhookEvent.ts");
    expect(src).toContain("WEBHOOK_EVENT_TYPES");

    const match = src.match(/WEBHOOK_EVENT_TYPES\s*=\s*\[([^\]]+)\]/s);
    expect(match).not.toBeNull();
    const elements = match![1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    expect(elements.length).toBe(8);
  });

  it("webhookEvent.ts exports WebhookEventType", async () => {
    const src = await readSrc("domain/models/webhookEvent.ts");
    expect(src).toContain("WebhookEventType");
    expect(src).toContain("export");
  });

  it("webhookEvent.ts contains all 8 event types", async () => {
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
// Usecase integration — deliverWebhookEvent present and fire-and-forget
// ---------------------------------------------------------------------------

const usecaseFiles = [
  "application/usecases/createRequest.ts",
  "application/usecases/submitRequest.ts",
  "application/usecases/approveRequest.ts",
  "application/usecases/rejectRequest.ts",
  "application/usecases/resubmitRequest.ts",
];

describe("Usecase integration", () => {
  for (const file of usecaseFiles) {
    it(`${file} calls deliverWebhookEvent`, async () => {
      const src = await readSrc(file);
      expect(src).toContain("deliverWebhookEvent");
    });

    it(`${file} calls deliverWebhookEvent with void (fire-and-forget)`, async () => {
      const src = await readSrc(file);
      expect(src).toContain("void deliverWebhookEvent");
    });

    it(`${file} calls deliverWebhookEvent outside db.transaction`, async () => {
      const src = await readSrc(file);
      // The last db.transaction block must be followed by a void deliverWebhookEvent call
      const txIdx = src.lastIndexOf("db.transaction");
      expect(txIdx).toBeGreaterThan(-1);

      // Find the last void deliverWebhookEvent in the file
      const deliverIdx = src.lastIndexOf("void deliverWebhookEvent");
      expect(deliverIdx).toBeGreaterThan(-1);

      // The last deliver call must appear after the last transaction start
      expect(deliverIdx).toBeGreaterThan(txIdx);

      // Verify: after the last db.transaction, find its closing "});"
      // The last deliver must come after that
      const txSection = src.slice(txIdx);
      const closingIdx = txSection.indexOf("});");
      expect(closingIdx).toBeGreaterThan(-1);
      const txCloseAbsolute = txIdx + closingIdx;
      expect(deliverIdx).toBeGreaterThan(txCloseAbsolute);
    });
  }
});

// ---------------------------------------------------------------------------
// Specific event types per usecase
// ---------------------------------------------------------------------------

describe("Usecase event types", () => {
  it('createRequest delivers "request.created"', async () => {
    const src = await readSrc("application/usecases/createRequest.ts");
    expect(src).toContain('"request.created"');
  });

  it('submitRequest delivers "request.submitted"', async () => {
    const src = await readSrc("application/usecases/submitRequest.ts");
    expect(src).toContain('"request.submitted"');
  });

  it('approveRequest delivers "step.approved" and "request.approved"', async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain('"step.approved"');
    expect(src).toContain('"request.approved"');
  });

  it('rejectRequest (revision) delivers "request.revised" and "step.rejected"', async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain('"request.revised"');
    expect(src).toContain('"step.rejected"');
  });

  it('rejectRequest (rejected) delivers "request.rejected"', async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain('"request.rejected"');
  });

  it('resubmitRequest delivers "request.resubmitted"', async () => {
    const src = await readSrc("application/usecases/resubmitRequest.ts");
    expect(src).toContain('"request.resubmitted"');
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
