/**
 * Approval deadline tests — usecase layer
 *
 * Runtime integration tests for deadline-related usecase behavior.
 * Infrastructure dependencies (repositories, db, next/server) are mocked
 * to isolate the usecase logic and verify actual runtime behavior.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";
import type { ApprovalStep } from "@/domain/models/approvalStep";
import type { Request } from "@/domain/models/request";
import type { ApprovalTemplate } from "@/domain/models/approvalTemplate";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// Mock state — mutated in beforeEach / individual tests
// ---------------------------------------------------------------------------

const state = {
  request: null as Request | null,
  /** Steps returned for non-TX findByRequestId calls */
  steps: [] as ApprovalStep[],
  /** Steps returned for TX-scoped findByRequestId calls (null → fall back to state.steps) */
  txSteps: null as ApprovalStep[] | null,
  overdueItems: [] as Array<{ requestId: string; organizationId: string }>,
  template: null as ApprovalTemplate | null,
  /** Arguments last passed to approvalStepRepository.createMany */
  createManyArgs: null as Array<{
    requestId: string;
    stepOrder: number;
    approverRole: string;
    organizationId: string;
    deadline?: Date | null;
  }> | null,
  auditLogCreateCalls: 0,
};

// ---------------------------------------------------------------------------
// Module mocks — bun:test hoists these before all static imports
// ---------------------------------------------------------------------------

mock.module("next/server", () => {
  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(data), {
        ...init,
        headers: { ...(init?.headers ?? {}), "Content-Type": "application/json" },
      });
    }
  }
  return { NextResponse: MockNextResponse };
});

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: object) => Promise<unknown>) =>
      fn({ __isTx: true }),
  },
}));

mock.module("@/infrastructure/repositories", () => ({
  requestRepository: {
    findById: async () => state.request,
    updateStatus: async () =>
      state.request ? { ...state.request, version: state.request.version + 1 } : null,
    create: async () => state.request,
  },
  approvalStepRepository: {
    /** Returns txSteps when called inside a transaction, otherwise steps */
    findByRequestId: async (_id: string, _orgId: string, tx?: object) =>
      tx !== undefined && state.txSteps !== null ? state.txSteps : state.steps,
    updateStatus: async () =>
      state.steps[0]
        ? { ...state.steps[0], status: "approved" as const, version: 2 }
        : null,
    createMany: async (
      steps: Array<{
        requestId: string;
        stepOrder: number;
        approverRole: string;
        organizationId: string;
        deadline?: Date | null;
      }>
    ) => {
      state.createManyArgs = steps;
      return steps.map((s, i) => ({
        id: `step-${i + 1}`,
        requestId: s.requestId,
        stepOrder: s.stepOrder,
        approverRole: s.approverRole,
        status: "pending" as const,
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        comment: null,
        organizationId: s.organizationId,
        version: 1,
        deadline: s.deadline ?? null,
      }));
    },
    findOverdueRequestIds: async () => state.overdueItems,
  },
  auditLogRepository: {
    create: async () => {
      state.auditLogCreateCalls++;
    },
  },
  approvalTemplateRepository: {
    findByOrganizationForAmount: async () =>
      state.template !== null ? [state.template] : [],
  },
  approvalDelegationRepository: {
    findActiveByToUserId: async () => [],
  },
}));

mock.module("@/infrastructure/webhookDelivery", () => ({
  deliverWebhookEvent: async () => undefined,
}));

// ---------------------------------------------------------------------------
// Imports — resolved after mocks are applied
// ---------------------------------------------------------------------------

import { approveRequest } from "@/application/usecases/approveRequest";
import { rejectRequest } from "@/application/usecases/rejectRequest";
import { expireOverdueRequests } from "@/application/usecases/expireOverdueRequests";
import { createRequest } from "@/application/usecases/createRequest";
import { POST } from "@/app/api/cron/expire-requests/route";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const PAST = new Date(Date.now() - 3_600_000);   // 1 hour ago
const FUTURE = new Date(Date.now() + 3_600_000); // 1 hour from now

function makeRequest(overrides?: Partial<Request>): Request {
  return {
    id: "req-1",
    title: "Test Request",
    description: null,
    status: "pending",
    amount: null,
    organizationId: "org-1",
    creatorId: "creator-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

function makeStep(overrides?: Partial<ApprovalStep>): ApprovalStep {
  return {
    id: "step-1",
    requestId: "req-1",
    stepOrder: 1,
    approverRole: "admin",
    status: "pending",
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    comment: null,
    organizationId: "org-1",
    version: 1,
    deadline: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TC-008 / TC-011: approveRequest deadline check
// ---------------------------------------------------------------------------

describe("approveRequest — deadline check (TC-008, TC-011)", () => {
  beforeEach(() => {
    state.request = makeRequest();
    state.steps = [];
    state.txSteps = null;
    state.auditLogCreateCalls = 0;
  });

  it("TC-008: returns expired error when current step deadline has passed", async () => {
    state.steps = [makeStep({ deadline: PAST })];

    const result = await approveRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorRole: "admin",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("この承認ステップの期限が切れています");
    }
  });

  it("TC-008: no audit log is created when pre-check blocks the expired step", async () => {
    state.steps = [makeStep({ deadline: PAST })];

    await approveRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorRole: "admin",
    });

    // Pre-check should short-circuit before entering the TX
    expect(state.auditLogCreateCalls).toBe(0);
  });

  it("TC-008 (pre-check isolation): rejects before entering TX when step is expired", async () => {
    // Outer snapshot: expired → pre-check must reject without entering TX
    state.steps = [makeStep({ deadline: PAST })];
    // TX snapshot: NOT expired → if code enters TX despite failed pre-check, it would succeed
    state.txSteps = [makeStep({ deadline: FUTURE })];

    const result = await approveRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorRole: "admin",
    });

    // Must be rejected (via pre-check); if TX were entered with the future txSteps the result would be ok=true
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("この承認ステップの期限が切れています");
    }
  });

  it("TC-011: TOCTOU — TX re-check blocks approval when step expires between pre-check and TX", async () => {
    // Pre-check: step deadline is in the future → passes
    state.steps = [makeStep({ deadline: FUTURE })];
    // TX re-check: step has now expired → must be blocked
    state.txSteps = [makeStep({ deadline: PAST })];

    const result = await approveRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorRole: "admin",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("この承認ステップの期限が切れています");
    }
  });

  it("succeeds when step has no deadline", async () => {
    state.steps = [makeStep({ deadline: null })];
    state.txSteps = [makeStep({ deadline: null })];

    const result = await approveRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorRole: "admin",
    });

    expect(result.ok).toBe(true);
  });

  it("succeeds when step deadline is in the future", async () => {
    state.steps = [makeStep({ deadline: FUTURE })];
    state.txSteps = [makeStep({ deadline: FUTURE })];

    const result = await approveRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorRole: "admin",
    });

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-012 / TC-013: rejectRequest deadline check
// ---------------------------------------------------------------------------

describe("rejectRequest — deadline check (TC-012, TC-013)", () => {
  beforeEach(() => {
    state.request = makeRequest();
    state.steps = [];
    state.txSteps = null;
    state.auditLogCreateCalls = 0;
  });

  it("TC-012: returns expired error for revision path when step deadline has passed", async () => {
    // Revision path checks the deadline inside the TX
    state.steps = [makeStep({ deadline: PAST })];
    state.txSteps = [makeStep({ deadline: PAST })];

    const result = await rejectRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      targetStatus: "revision",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("この承認ステップの期限が切れています");
    }
  });

  it("TC-013: returns expired error for rejected path when step deadline has passed", async () => {
    // Rejected path checks the deadline in a pre-check outside the TX
    state.steps = [makeStep({ deadline: PAST })];

    const result = await rejectRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      targetStatus: "rejected",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("この承認ステップの期限が切れています");
    }
  });

  it("revision path succeeds when step has no deadline", async () => {
    state.steps = [makeStep({ deadline: null })];
    state.txSteps = [makeStep({ deadline: null })];

    const result = await rejectRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      targetStatus: "revision",
    });

    expect(result.ok).toBe(true);
  });

  it("rejected path succeeds when step has no deadline", async () => {
    state.steps = [makeStep({ deadline: null })];
    state.txSteps = [makeStep({ deadline: null })];

    const result = await rejectRequest({
      requestId: "req-1",
      organizationId: "org-1",
      actorId: "user-1",
      targetStatus: "rejected",
    });

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-015 / TC-016: expireOverdueRequests usecase
// ---------------------------------------------------------------------------

describe("expireOverdueRequests — usecase (TC-015, TC-016)", () => {
  const originalSystemUserId = process.env.SYSTEM_USER_ID;

  beforeEach(() => {
    state.request = makeRequest();
    state.overdueItems = [];
    state.auditLogCreateCalls = 0;
  });

  afterEach(() => {
    if (originalSystemUserId !== undefined) {
      process.env.SYSTEM_USER_ID = originalSystemUserId;
    } else {
      delete process.env.SYSTEM_USER_ID;
    }
  });

  it("TC-016: returns ok=false with reason when SYSTEM_USER_ID is not set", async () => {
    delete process.env.SYSTEM_USER_ID;

    const result = await expireOverdueRequests();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("SYSTEM_USER_ID is not set");
    }
  });

  it("TC-015: returns ok=true with expired count when there are overdue items", async () => {
    process.env.SYSTEM_USER_ID = "system-user-1";
    state.overdueItems = [{ requestId: "req-1", organizationId: "org-1" }];

    const result = await expireOverdueRequests();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expired).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("TC-015: creates audit log entry for each expired request", async () => {
    process.env.SYSTEM_USER_ID = "system-user-1";
    state.overdueItems = [{ requestId: "req-1", organizationId: "org-1" }];

    await expireOverdueRequests();

    expect(state.auditLogCreateCalls).toBeGreaterThanOrEqual(1);
  });

  it("returns ok=true with zero counts when there are no overdue items", async () => {
    process.env.SYSTEM_USER_ID = "system-user-1";
    state.overdueItems = [];

    const result = await expireOverdueRequests();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expired).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("usecase is exported from usecases index", async () => {
    const src = await readSrc("application/usecases/index.ts");
    expect(src).toContain("expireOverdueRequests");
  });
});

// ---------------------------------------------------------------------------
// TC-020–023: cron route handler authentication
// ---------------------------------------------------------------------------

describe("cron route handler — /api/cron/expire-requests (TC-020–TC-023)", () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalSystemUserId = process.env.SYSTEM_USER_ID;

  beforeEach(() => {
    state.overdueItems = [];
    state.request = makeRequest();
    state.auditLogCreateCalls = 0;
    process.env.SYSTEM_USER_ID = "system-user-1";
  });

  afterEach(() => {
    if (originalCronSecret !== undefined) {
      process.env.CRON_SECRET = originalCronSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
    if (originalSystemUserId !== undefined) {
      process.env.SYSTEM_USER_ID = originalSystemUserId;
    } else {
      delete process.env.SYSTEM_USER_ID;
    }
  });

  it("TC-020: returns 200 when Authorization token exactly matches CRON_SECRET", async () => {
    process.env.CRON_SECRET = "correct-secret-token";

    const req = new Request("http://localhost/api/cron/expire-requests", {
      method: "POST",
      headers: { Authorization: "Bearer correct-secret-token" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("TC-021: returns 401 when token has same byte-length but wrong content", async () => {
    process.env.CRON_SECRET = "secret-aaa";

    const req = new Request("http://localhost/api/cron/expire-requests", {
      method: "POST",
      headers: { Authorization: "Bearer secret-bbb" }, // same length, wrong value
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("TC-022: returns 401 when token length does not match CRON_SECRET", async () => {
    process.env.CRON_SECRET = "long-secret-token";

    const req = new Request("http://localhost/api/cron/expire-requests", {
      method: "POST",
      headers: { Authorization: "Bearer short" }, // different length
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("TC-023: returns 401 when CRON_SECRET environment variable is not configured", async () => {
    delete process.env.CRON_SECRET;

    const req = new Request("http://localhost/api/cron/expire-requests", {
      method: "POST",
      headers: { Authorization: "Bearer any-token" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is missing", async () => {
    process.env.CRON_SECRET = "some-secret";

    const req = new Request("http://localhost/api/cron/expire-requests", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// TC-025 / TC-026: createRequest deadline calculation
// ---------------------------------------------------------------------------

describe("createRequest — deadline calculation (TC-025, TC-026)", () => {
  beforeEach(() => {
    state.request = makeRequest({ status: "draft" });
    state.createManyArgs = null;
    state.auditLogCreateCalls = 0;
  });

  it("TC-025: computes deadline from deadlineHours when the template step has deadlineHours set", async () => {
    const before = Date.now();
    state.template = {
      id: "tmpl-1",
      name: "High-Value Template",
      organizationId: "org-1",
      steps: [{ stepOrder: 1, approverRole: "manager", deadlineHours: 72 }],
      minAmount: null,
      maxAmount: null,
      createdAt: new Date(),
    };

    await createRequest({
      title: "Large Purchase",
      description: null,
      amount: 100_000,
      organizationId: "org-1",
      creatorId: "creator-1",
    });

    expect(state.createManyArgs).not.toBeNull();
    const step = state.createManyArgs![0];
    expect(step).toBeDefined();
    expect(step.deadline).toBeInstanceOf(Date);
    // deadline must be approximately before + 72 hours
    const expectedMin = before + 72 * 60 * 60 * 1000 - 500;
    const expectedMax = before + 72 * 60 * 60 * 1000 + 500;
    expect(step.deadline!.getTime()).toBeGreaterThan(expectedMin);
    expect(step.deadline!.getTime()).toBeLessThan(expectedMax);
  });

  it("TC-026: sets deadline to null when the template step has no deadlineHours", async () => {
    state.template = {
      id: "tmpl-2",
      name: "Standard Template",
      organizationId: "org-1",
      steps: [{ stepOrder: 1, approverRole: "manager" }], // no deadlineHours
      minAmount: null,
      maxAmount: null,
      createdAt: new Date(),
    };

    await createRequest({
      title: "Standard Purchase",
      description: null,
      amount: 1_000,
      organizationId: "org-1",
      creatorId: "creator-1",
    });

    expect(state.createManyArgs).not.toBeNull();
    const step = state.createManyArgs![0];
    expect(step).toBeDefined();
    expect(step.deadline).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-11: UI deadline display (static analysis — React rendering not unit-testable)
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
// T-12: seed data (static analysis — seed content verified by reading file)
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
