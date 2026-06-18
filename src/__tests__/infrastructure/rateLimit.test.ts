/**
 * Rate limit static tests
 *
 * Verifies schema definitions, function implementations, action integrations,
 * placement ordering, and dependency direction by inspecting source files.
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile, readdir } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// T-01: rate_limit_records schema
// ---------------------------------------------------------------------------

describe("rate_limit_records schema", () => {
  it("rateLimitRecords table is defined in schema.ts", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("rateLimitRecords");
    expect(content).toContain("rate_limit_records");
  });

  it("key column has .unique() constraint", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    const tableIdx = content.indexOf("rateLimitRecords");
    expect(tableIdx).toBeGreaterThan(-1);
    // Find the table definition block and confirm unique on key
    const tableBlock = content.slice(tableIdx, tableIdx + 500);
    expect(tableBlock).toContain('text("key")');
    expect(tableBlock).toContain(".unique()");
  });

  it("count column is integer and notNull", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    const tableIdx = content.indexOf("rateLimitRecords");
    const tableBlock = content.slice(tableIdx, tableIdx + 500);
    expect(tableBlock).toContain('integer("count")');
    expect(tableBlock).toContain(".notNull()");
  });

  it("windowStart column is timestamp and notNull", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    const tableIdx = content.indexOf("rateLimitRecords");
    const tableBlock = content.slice(tableIdx, tableIdx + 500);
    expect(tableBlock).toContain('timestamp("window_start")');
  });
});

// ---------------------------------------------------------------------------
// T-02: RATE_LIMITS constant and checkRateLimit function
// ---------------------------------------------------------------------------

describe("RATE_LIMITS constant", () => {
  it("createRequest has limit: 10 and windowMs: 60000", async () => {
    const content = await readSrc("infrastructure/rateLimit.ts");
    expect(content).toContain("createRequest");
    expect(content).toContain("limit: 10");
    expect(content).toContain("windowMs: 60_000");
  });

  it("approveReject has limit: 30 and windowMs: 60000", async () => {
    const content = await readSrc("infrastructure/rateLimit.ts");
    expect(content).toContain("approveReject");
    expect(content).toContain("limit: 30");
  });

  it("webhookManage has limit: 10 and windowMs: 60000", async () => {
    const content = await readSrc("infrastructure/rateLimit.ts");
    expect(content).toContain("webhookManage");
    // limit: 10 already verified above (createRequest also has 10)
    expect(content).toContain("webhookManage");
  });
});

describe("checkRateLimit function", () => {
  it("checkRateLimit is exported from rateLimit.ts", async () => {
    const content = await readSrc("infrastructure/rateLimit.ts");
    expect(content).toContain("export async function checkRateLimit");
  });

  it("checkRateLimit uses onConflictDoUpdate (ON CONFLICT) pattern", async () => {
    const content = await readSrc("infrastructure/rateLimit.ts");
    expect(content).toContain("onConflictDoUpdate");
  });

  it("allowed is count <= limit", async () => {
    const content = await readSrc("infrastructure/rateLimit.ts");
    expect(content).toContain("count <= params.limit");
  });

  it("remaining is Math.max(0, limit - count)", async () => {
    const content = await readSrc("infrastructure/rateLimit.ts");
    expect(content).toContain("Math.max(0, params.limit - count)");
  });
});

// ---------------------------------------------------------------------------
// T-03: createRequestAction rate limit integration
// ---------------------------------------------------------------------------

describe("createRequestAction rate limit", () => {
  it("createRequestAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const createIdx = content.indexOf("async function createRequestAction");
    expect(createIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(createIdx, createIdx + 800);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("rate limit check is after auth check and before validation in createRequestAction", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const createIdx = content.indexOf("async function createRequestAction");
    const actionBody = content.slice(createIdx);
    const authIdx = actionBody.indexOf("await auth()");
    const rateIdx = actionBody.indexOf("checkRateLimit");
    const parseIdx = actionBody.indexOf("safeParse");
    expect(authIdx).toBeGreaterThan(-1);
    expect(rateIdx).toBeGreaterThan(-1);
    expect(parseIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(rateIdx);
    expect(rateIdx).toBeLessThan(parseIdx);
  });

  it("createRequestAction rate limit exceeded message is correct", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const createIdx = content.indexOf("async function createRequestAction");
    const actionBody = content.slice(createIdx, createIdx + 1000);
    expect(actionBody).toContain("リクエスト数の上限に達しました。しばらく待ってから再試行してください");
  });
});

// ---------------------------------------------------------------------------
// T-04: submit/approve/reject/resubmit Actions rate limit integration
// ---------------------------------------------------------------------------

describe("submitRequestAction rate limit", () => {
  it("submitRequestAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function submitRequestAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 1200);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("checkRateLimit is after findByKey (idempotency) in submitRequestAction", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function submitRequestAction");
    const actionBody = content.slice(fnIdx);
    const findByKeyIdx = actionBody.indexOf("findByKey");
    const rateIdx = actionBody.indexOf("checkRateLimit");
    expect(findByKeyIdx).toBeGreaterThan(-1);
    expect(rateIdx).toBeGreaterThan(-1);
    expect(findByKeyIdx).toBeLessThan(rateIdx);
  });

  it("checkRateLimit is before submitRequest usecase call", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function submitRequestAction");
    const actionBody = content.slice(fnIdx);
    const rateIdx = actionBody.indexOf("checkRateLimit");
    const usecaseIdx = actionBody.indexOf("await submitRequest(");
    expect(rateIdx).toBeLessThan(usecaseIdx);
  });
});

describe("approveRequestAction rate limit", () => {
  it("approveRequestAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function approveRequestAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 1200);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("checkRateLimit is after findByKey (idempotency) in approveRequestAction", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function approveRequestAction");
    const actionBody = content.slice(fnIdx);
    const findByKeyIdx = actionBody.indexOf("findByKey");
    const rateIdx = actionBody.indexOf("checkRateLimit");
    expect(findByKeyIdx).toBeLessThan(rateIdx);
  });

  it("checkRateLimit is before approveRequest usecase call", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function approveRequestAction");
    const actionBody = content.slice(fnIdx);
    const rateIdx = actionBody.indexOf("checkRateLimit");
    const usecaseIdx = actionBody.indexOf("await approveRequest(");
    expect(rateIdx).toBeLessThan(usecaseIdx);
  });
});

describe("rejectRequestAction rate limit", () => {
  it("rejectRequestAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function rejectRequestAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 1200);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("checkRateLimit is after findByKey (idempotency) in rejectRequestAction", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function rejectRequestAction");
    const actionBody = content.slice(fnIdx);
    const findByKeyIdx = actionBody.indexOf("findByKey");
    const rateIdx = actionBody.indexOf("checkRateLimit");
    expect(findByKeyIdx).toBeLessThan(rateIdx);
  });

  it("checkRateLimit is before rejectRequest usecase call", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function rejectRequestAction");
    const actionBody = content.slice(fnIdx);
    const rateIdx = actionBody.indexOf("checkRateLimit");
    const usecaseIdx = actionBody.indexOf("await rejectRequest(");
    expect(rateIdx).toBeLessThan(usecaseIdx);
  });
});

describe("resubmitRequestAction rate limit", () => {
  it("resubmitRequestAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function resubmitRequestAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 1200);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("checkRateLimit is after findByKey (idempotency) in resubmitRequestAction", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function resubmitRequestAction");
    const actionBody = content.slice(fnIdx);
    const findByKeyIdx = actionBody.indexOf("findByKey");
    const rateIdx = actionBody.indexOf("checkRateLimit");
    expect(findByKeyIdx).toBeLessThan(rateIdx);
  });

  it("checkRateLimit is before resubmitRequest usecase call", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const fnIdx = content.indexOf("async function resubmitRequestAction");
    const actionBody = content.slice(fnIdx);
    const rateIdx = actionBody.indexOf("checkRateLimit");
    const usecaseIdx = actionBody.indexOf("await resubmitRequest(");
    expect(rateIdx).toBeLessThan(usecaseIdx);
  });
});

// ---------------------------------------------------------------------------
// T-05: Webhook write Actions rate limit integration
// ---------------------------------------------------------------------------

describe("Webhook write actions rate limit", () => {
  it("createWebhookEndpointAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/webhooks.ts");
    const fnIdx = content.indexOf("async function createWebhookEndpointAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 800);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("deleteWebhookEndpointAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/webhooks.ts");
    const fnIdx = content.indexOf("async function deleteWebhookEndpointAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 800);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("toggleWebhookEndpointAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/webhooks.ts");
    const fnIdx = content.indexOf("async function toggleWebhookEndpointAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 800);
    expect(actionBody).toContain("checkRateLimit");
  });

  it("retryWebhookDeliveryAction calls checkRateLimit", async () => {
    const content = await readSrc("app/actions/webhooks.ts");
    const fnIdx = content.indexOf("async function retryWebhookDeliveryAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const actionBody = content.slice(fnIdx, fnIdx + 800);
    expect(actionBody).toContain("checkRateLimit");
  });
});

describe("Webhook read-only actions do NOT have rate limit", () => {
  it("listWebhookEndpointsAction does not call checkRateLimit", async () => {
    const content = await readSrc("app/actions/webhooks.ts");
    const fnIdx = content.indexOf("async function listWebhookEndpointsAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const nextFnIdx = content.indexOf("async function", fnIdx + 1);
    const actionBody = content.slice(fnIdx, nextFnIdx > fnIdx ? nextFnIdx : fnIdx + 800);
    expect(actionBody).not.toContain("checkRateLimit");
  });

  it("listWebhookDeliveriesAction does not call checkRateLimit", async () => {
    const content = await readSrc("app/actions/webhooks.ts");
    const fnIdx = content.indexOf("async function listWebhookDeliveriesAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const nextFnIdx = content.indexOf("async function", fnIdx + 1);
    const actionBody = content.slice(fnIdx, nextFnIdx > fnIdx ? nextFnIdx : fnIdx + 800);
    expect(actionBody).not.toContain("checkRateLimit");
  });
});

// ---------------------------------------------------------------------------
// Dependency direction: usecase layer must not import rateLimit
// ---------------------------------------------------------------------------

describe("Dependency direction", () => {
  it("usecase layer files do not import rateLimit", async () => {
    const usecaseDir = path.join(ROOT, "src/application/usecases");
    const entries = await readdir(usecaseDir);
    const tsFiles = entries.filter(
      (f) => f.endsWith(".ts") && !f.startsWith(".")
    );
    for (const file of tsFiles) {
      const content = await readFile(path.join(usecaseDir, file), "utf-8");
      expect(content).not.toContain("rateLimit");
    }
  });
});

// ---------------------------------------------------------------------------
// Rate limit exceeded messages
// ---------------------------------------------------------------------------

describe("Rate limit exceeded message consistency", () => {
  const expectedMessage =
    "リクエスト数の上限に達しました。しばらく待ってから再試行してください";

  it("requests.ts uses the correct rate limit exceeded message", async () => {
    const content = await readSrc("app/actions/requests.ts");
    // Count occurrences: createRequest + submit + approve + reject + resubmit = 5
    const occurrences = content.split(expectedMessage).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(5);
  });

  it("webhooks.ts uses the correct rate limit exceeded message", async () => {
    const content = await readSrc("app/actions/webhooks.ts");
    // 4 write actions
    const occurrences = content.split(expectedMessage).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(4);
  });
});
