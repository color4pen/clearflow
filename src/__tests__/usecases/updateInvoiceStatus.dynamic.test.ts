/**
 * updateInvoiceStatus usecase の動的テスト（TC-015）。
 * mock.module 方式で repository 層・DB・dispatcher をモックし、
 * recordAudit が { fromStatus, toStatus } を metadata に記録することを検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Invoice, InvoiceStatus } from "@/domain/models/invoice";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  existingInvoice: null as Invoice | null,
  auditArgs: null as Record<string, unknown> | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

// DB: transaction を即時実行するモック
mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

// invoiceRepository バレルモック
mock.module("@/infrastructure/repositories", () => ({
  invoiceRepository: {
    findById: async (_id: string, _orgId: string) => state.existingInvoice,
    updateStatus: async (
      id: string,
      _orgId: string,
      newStatus: InvoiceStatus,
      _additionalFields: Record<string, unknown>,
      _version: number,
      _tx?: unknown
    ) => {
      if (!state.existingInvoice) return null;
      return { ...state.existingInvoice, id, status: newStatus };
    },
  },
}));

// recordAudit の引数を捕捉する
mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (args: Record<string, unknown>, _tx?: unknown) => {
    state.auditArgs = args;
    return { id: "audit-001", ...args, createdAt: new Date() };
  },
}));

// dispatcher: runInContext はコールバックを直接実行し、dispatch/flushAsync は no-op
mock.module("@/domain/events", () => ({
  dispatcher: {
    runInContext: async (fn: () => Promise<unknown>) => fn(),
    dispatch: async () => {},
    flushAsync: () => {},
  },
}));

// validateInvoiceTransition: 常に ok=true を返すモック
mock.module("@/domain/services/invoiceTransition", () => ({
  validateInvoiceTransition: () => ({ ok: true }),
}));

import { updateInvoiceStatus } from "@/application/usecases/updateInvoiceStatus";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const ACTOR_ID = "user-001";
const INVOICE_ID = "inv-001";
const CONTRACT_ID = "contract-001";

const baseInvoice: Invoice = {
  id: INVOICE_ID,
  organizationId: ORG_ID,
  contractId: CONTRACT_ID,
  title: "テスト請求",
  amount: 100000,
  issueDate: null,
  dueDate: new Date("2026-03-31"),
  status: "scheduled",
  invoicedAt: null,
  paidAt: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

// ---------------------------------------------------------------------------
// TC-015: invoice.update_status の metadata に { fromStatus, toStatus } が記録される
// ---------------------------------------------------------------------------

describe("updateInvoiceStatus — TC-015: metadata { fromStatus, toStatus } の記録", () => {
  beforeEach(() => {
    state.existingInvoice = null;
    state.auditArgs = null;
  });

  it("scheduled → invoiced 遷移時に recordAudit へ fromStatus/toStatus が渡される", async () => {
    state.existingInvoice = { ...baseInvoice, status: "scheduled" };

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      newStatus: "invoiced",
    });

    expect(result.ok).toBe(true);
    expect(state.auditArgs).not.toBeNull();
    expect(state.auditArgs?.action).toBe("invoice.update_status");
    expect(state.auditArgs?.targetType).toBe("invoice");
    expect(state.auditArgs?.targetId).toBe(INVOICE_ID);
    const metadata = state.auditArgs?.metadata as Record<string, unknown>;
    expect(metadata?.fromStatus).toBe("scheduled");
    expect(metadata?.toStatus).toBe("invoiced");
  });

  it("invoiced → paid 遷移時に recordAudit へ fromStatus/toStatus が渡される", async () => {
    state.existingInvoice = { ...baseInvoice, status: "invoiced" };

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      newStatus: "paid",
    });

    expect(result.ok).toBe(true);
    expect(state.auditArgs).not.toBeNull();
    const metadata = state.auditArgs?.metadata as Record<string, unknown>;
    expect(metadata?.fromStatus).toBe("invoiced");
    expect(metadata?.toStatus).toBe("paid");
  });

  it("invoiced → overdue 遷移時に recordAudit へ fromStatus/toStatus が渡される", async () => {
    state.existingInvoice = { ...baseInvoice, status: "invoiced" };

    const result = await updateInvoiceStatus({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      newStatus: "overdue",
    });

    expect(result.ok).toBe(true);
    expect(state.auditArgs).not.toBeNull();
    const metadata = state.auditArgs?.metadata as Record<string, unknown>;
    expect(metadata?.fromStatus).toBe("invoiced");
    expect(metadata?.toStatus).toBe("overdue");
  });

  it("請求が存在しない場合は recordAudit が呼ばれない", async () => {
    state.existingInvoice = null;

    const result = await updateInvoiceStatus({
      invoiceId: "nonexistent-id",
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      newStatus: "invoiced",
    });

    expect(result.ok).toBe(false);
    expect(state.auditArgs).toBeNull();
  });
});
