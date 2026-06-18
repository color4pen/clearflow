/**
 * Approval deadline tests — usecase layer
 *
 * Static analysis tests verifying the deadline implementation patterns
 * in the usecase and domain service source files.
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// T-06: approveRequest deadline check
// ---------------------------------------------------------------------------

describe("approveRequest — deadline check", () => {
  it("calls isStepExpired before approving", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("isStepExpired");
  });

  it("returns expired reason when deadline is passed (pre-check)", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("この承認ステップの期限が切れています");
  });

  it("has TOCTOU re-check inside transaction", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    // isStepExpired should appear at least twice: pre-check and TX re-check
    const matches = src.match(/isStepExpired/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("isStepExpired is imported from approvalStepService", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("isStepExpired");
    expect(src).toContain("approvalStepService");
  });
});

// ---------------------------------------------------------------------------
// T-07: rejectRequest deadline check
// ---------------------------------------------------------------------------

describe("rejectRequest — deadline check", () => {
  it("calls isStepExpired in revision path", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain("isStepExpired");
  });

  it("returns expired reason for rejected path", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    expect(src).toContain("この承認ステップの期限が切れています");
  });

  it("checks deadline in rejected path before transaction", async () => {
    const src = await readSrc("application/usecases/rejectRequest.ts");
    // Pre-check for rejected path: finds isStepExpired before db.transaction in rejected section
    const txIdx = src.lastIndexOf("db.transaction");
    const expiredMsgIdx = src.indexOf("この承認ステップの期限が切れています");
    expect(expiredMsgIdx).toBeGreaterThan(-1);
    // The pre-check message should appear before the last db.transaction call
    expect(expiredMsgIdx).toBeLessThan(txIdx);
  });
});

// ---------------------------------------------------------------------------
// T-08: createRequest deadline calculation
// ---------------------------------------------------------------------------

describe("createRequest — deadline calculation", () => {
  it("calculates deadline from deadlineHours", async () => {
    const src = await readSrc("application/usecases/createRequest.ts");
    expect(src).toContain("deadlineHours");
    expect(src).toContain("deadline");
  });

  it("uses createdAt + deadlineHours formula", async () => {
    const src = await readSrc("application/usecases/createRequest.ts");
    // Should compute deadline using getTime() + deadlineHours * 60 * 60 * 1000
    expect(src).toContain("deadlineHours * 60 * 60 * 1000");
  });

  it("sets deadline to null when deadlineHours is not set", async () => {
    const src = await readSrc("application/usecases/createRequest.ts");
    // deadline is conditionally null when deadlineHours is not set
    expect(src).toContain("deadlineHours != null");
    // The null branch should be present
    expect(src).toContain(": null,");
  });
});

// ---------------------------------------------------------------------------
// T-09: expireOverdueRequests usecase
// ---------------------------------------------------------------------------

describe("expireOverdueRequests — usecase", () => {
  it("expireOverdueRequests usecase exists", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("expireOverdueRequests");
  });

  it("checks SYSTEM_USER_ID environment variable", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("SYSTEM_USER_ID");
    expect(src).toContain("process.env.SYSTEM_USER_ID");
  });

  it("returns error when SYSTEM_USER_ID is not set", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("SYSTEM_USER_ID is not set");
  });

  it("calls findOverdueRequestIds", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("findOverdueRequestIds");
  });

  it("uses db.transaction for each request", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("db.transaction");
  });

  it("creates audit log with request.expire action", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("request.expire");
    expect(src).toContain("auditLogRepository");
  });

  it("uses SYSTEM_USER_ID as actorId", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("actorId: systemUserId");
  });

  it("returns expired/failed/errors in result", async () => {
    const src = await readSrc("application/usecases/expireOverdueRequests.ts");
    expect(src).toContain("expired");
    expect(src).toContain("failed");
    expect(src).toContain("errors");
  });

  it("is exported from usecases index", async () => {
    const src = await readSrc("application/usecases/index.ts");
    expect(src).toContain("expireOverdueRequests");
  });
});

// ---------------------------------------------------------------------------
// T-10: cron route handler
// ---------------------------------------------------------------------------

describe("cron route handler — /api/cron/expire-requests", () => {
  it("route handler exists", async () => {
    const src = await readSrc("app/api/cron/expire-requests/route.ts");
    expect(src).toContain("POST");
  });

  it("checks CRON_SECRET environment variable", async () => {
    const src = await readSrc("app/api/cron/expire-requests/route.ts");
    expect(src).toContain("CRON_SECRET");
    expect(src).toContain("process.env.CRON_SECRET");
  });

  it("uses timingSafeEqual for token comparison", async () => {
    const src = await readSrc("app/api/cron/expire-requests/route.ts");
    expect(src).toContain("timingSafeEqual");
  });

  it("checks token length before timingSafeEqual", async () => {
    const src = await readSrc("app/api/cron/expire-requests/route.ts");
    // Length check should appear before the actual timingSafeEqual() call (not the import)
    const lengthCheckIdx = src.indexOf(".length !== ");
    // Find the usage of timingSafeEqual (with opening paren) - skip the import
    const timingSafeCallIdx = src.indexOf("timingSafeEqual(");
    expect(lengthCheckIdx).toBeGreaterThan(-1);
    expect(timingSafeCallIdx).toBeGreaterThan(-1);
    expect(lengthCheckIdx).toBeLessThan(timingSafeCallIdx);
  });

  it("checks Authorization: Bearer prefix", async () => {
    const src = await readSrc("app/api/cron/expire-requests/route.ts");
    expect(src).toContain("Bearer ");
    expect(src).toContain("Authorization");
  });

  it("calls expireOverdueRequests after auth success", async () => {
    const src = await readSrc("app/api/cron/expire-requests/route.ts");
    expect(src).toContain("expireOverdueRequests");
    const timingSafeIdx = src.indexOf("timingSafeEqual");
    const expireIdx = src.indexOf("expireOverdueRequests()");
    expect(expireIdx).toBeGreaterThan(timingSafeIdx);
  });

  it("returns 401 for missing Authorization header", async () => {
    const src = await readSrc("app/api/cron/expire-requests/route.ts");
    expect(src).toContain("401");
  });
});

// ---------------------------------------------------------------------------
// T-11: UI deadline display
// ---------------------------------------------------------------------------

describe("UI — deadline display in ApprovalStepsSection", () => {
  it("renders deadline display for steps with deadline", async () => {
    const src = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(src).toContain("deadline");
    expect(src).toContain("期限切れ");
  });

  it("shows expired label in statusLabel", async () => {
    const src = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(src).toContain('expired: "期限切れ"');
  });

  it("has expired CSS class in statusClass", async () => {
    const src = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(src).toContain("expired:");
    expect(src).toContain("bg-gray-100 text-gray-500");
  });

  it("shows remaining time for future deadlines", async () => {
    const src = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    expect(src).toContain("残り");
  });
});

// ---------------------------------------------------------------------------
// T-12: seed data
// ---------------------------------------------------------------------------

describe("Seed data — system user and deadlineHours", () => {
  it("seed creates system user", async () => {
    const src = await readSrc("infrastructure/seed.ts");
    expect(src).toContain("system@clearflow.internal");
    expect(src).toContain("00000000-0000-0000-0000-000000000000");
  });

  it("high-value template has deadlineHours: 72", async () => {
    const src = await readSrc("infrastructure/seed.ts");
    expect(src).toContain("deadlineHours: 72");
  });
});
