/**
 * Webhook retry and audit log CSV export tests — static code analysis
 *
 * Verifies webhook retry logic and audit log CSV export implementation
 * via source file inspection.
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile, access } from "fs/promises";
import { constants } from "fs";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

async function fileExists(relPath: string): Promise<boolean> {
  try {
    await access(path.join(ROOT, relPath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Webhook retry — constants and loop
// ---------------------------------------------------------------------------

describe("Webhook retry logic", () => {
  it("webhookDelivery.ts has MAX_ATTEMPTS constant with value 4", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("MAX_ATTEMPTS");
    expect(src).toContain("= 4");
  });

  it("webhookDelivery.ts has BASE_DELAY_MS constant with value 1000", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("BASE_DELAY_MS");
    expect(src).toContain("1000");
  });

  it("webhookDelivery.ts uses Bun.sleep for backoff delay", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("Bun.sleep");
  });

  it("webhookDelivery.ts has a retry loop (for or while)", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    const hasFor = src.includes("for ");
    const hasWhile = src.includes("while ");
    expect(hasFor || hasWhile).toBe(true);
  });

  it("webhookDelivery.ts increments attempts in loop", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    // The loop variable 'attempt' is used as the attempts count
    expect(src).toContain("attempt");
    // Multiple occurrences of 'attempts:' in updateStatus calls
    const matchCount = (src.match(/attempts:/g) ?? []).length;
    expect(matchCount).toBeGreaterThan(1);
  });

  it("schema.ts has next_retry_at column", async () => {
    const src = await readSrc("infrastructure/schema.ts");
    expect(src).toContain("next_retry_at");
  });

  it("domain/models/webhookDelivery.ts has nextRetryAt field", async () => {
    const src = await readSrc("domain/models/webhookDelivery.ts");
    expect(src).toContain("nextRetryAt");
  });

  it("app/actions/webhooks.ts has retryWebhookDeliveryAction", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    expect(src).toContain("retryWebhookDeliveryAction");
  });

  it('retryWebhookDeliveryAction checks for "failed" status', async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    const retryIdx = src.indexOf("retryWebhookDeliveryAction");
    expect(retryIdx).toBeGreaterThan(-1);
    const afterRetry = src.slice(retryIdx);
    expect(afterRetry).toContain('"failed"');
  });

  it("webhookDelivery.ts exports deliverSingleAttempt function", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("export async function deliverSingleAttempt");
  });

  it("retryWebhookDeliveryAction calls deliverSingleAttempt (not deliverToEndpoint)", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    const retryIdx = src.indexOf("retryWebhookDeliveryAction");
    expect(retryIdx).toBeGreaterThan(-1);
    const afterRetry = src.slice(retryIdx);
    expect(afterRetry).toContain("deliverSingleAttempt");
  });
});

// ---------------------------------------------------------------------------
// Audit log CSV export
// ---------------------------------------------------------------------------

describe("Audit log CSV export", () => {
  it("auditLogRepository.ts has findByOrganization function", async () => {
    const src = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(src).toContain("findByOrganization");
  });

  it("findByOrganization has organizationId parameter", async () => {
    const src = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    const fnIdx = src.indexOf("findByOrganization");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("organizationId");
  });

  it("app/api/audit-logs/export/route.ts exists", async () => {
    const exists = await fileExists("src/app/api/audit-logs/export/route.ts");
    expect(exists).toBe(true);
  });

  it("audit-logs export route returns text/csv", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("text/csv");
  });

  it("audit-logs export route calls auth()", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("auth()");
  });

  it("audit-logs export route checks admin role", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("admin");
  });

  it("audit-logs export route filters by organizationId", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("organizationId");
  });

  it("audit-logs export route exports GET handler", async () => {
    const src = await readSrc("app/api/audit-logs/export/route.ts");
    expect(src).toContain("export async function GET");
  });

  it("app/(dashboard)/settings/audit-logs/page.tsx exists", async () => {
    const exists = await fileExists("src/app/(dashboard)/settings/audit-logs/page.tsx");
    expect(exists).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility — TC-043
// ---------------------------------------------------------------------------

describe("Backward compatibility (TC-043)", () => {
  /**
   * TC-043: 既存の webhookWorkflow テストが引き続き pass する
   *
   * webhookDelivery.ts にリトライロジックを追加した後も、
   * AbortSignal.timeout, X-Clearflow-Signature, fetch, void deliverWebhookEvent
   * 等の既存プロパティが維持されていることを確認する。
   */
  it("TC-043: webhookDelivery.ts still uses AbortSignal.timeout(5000) after retry changes", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("AbortSignal.timeout");
    expect(src).toContain("5000");
  });

  it("TC-043: webhookDelivery.ts still includes X-Clearflow-Signature header", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("X-Clearflow-Signature");
  });

  it("TC-043: webhookDelivery.ts still uses fetch for HTTP delivery", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("fetch");
  });

  it("TC-043: webhookDelivery.ts still exports deliverWebhookEvent", async () => {
    const src = await readSrc("infrastructure/webhookDelivery.ts");
    expect(src).toContain("deliverWebhookEvent");
    expect(src).toContain("export");
  });
});
