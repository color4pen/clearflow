/**
 * createInvoiceAdjustment usecase の動的テスト。
 * mock.module を使って実際のビジネスロジックを検証する。
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { mock } from "bun:test";
import type { Interaction } from "@/domain/models/interaction";
import type { Invoice } from "@/domain/models/invoice";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  invoice: null as Invoice | null,
  createdInteraction: null as Interaction | null,
  createArgs: null as Record<string, unknown> | null,
  auditArgs: null as {
    action: string;
    targetType: string;
    targetId: string;
    actorId: string;
    organizationId: string;
    metadata: Record<string, unknown> | null;
  } | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories", () => ({
  invoiceRepository: {
    findById: async () => state.invoice,
  },
  interactionRepository: {
    create: async (data: Record<string, unknown>) => {
      state.createArgs = data;
      return state.createdInteraction!;
    },
  },
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (args: typeof state.auditArgs) => {
    state.auditArgs = args;
  },
}));

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { createInvoiceAdjustment } from "@/application/usecases/createInvoiceAdjustment";

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const INVOICE_ID = "invoice-001";
const CONTRACT_ID = "contract-001";
const ACTOR_ID = "actor-001";
const INTERACTION_ID = "interaction-002";

function makeInvoice(): Invoice {
  return {
    id: INVOICE_ID,
    organizationId: ORG_ID,
    contractId: CONTRACT_ID,
    title: "テスト請求",
    amount: 500000,
    issueDate: new Date("2026-06-01"),
    dueDate: new Date("2026-06-30"),
    status: "invoiced",
    invoicedAt: new Date("2026-06-01"),
    paidAt: null,
    notes: null,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    version: 1,
  };
}

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: INTERACTION_ID,
    organizationId: ORG_ID,
    kind: "note",
    dealId: null,
    inquiryId: null,
    contractId: null,
    invoiceId: INVOICE_ID,
    clientId: null,
    meetingType: null,
    date: new Date("2026-06-15"),
    location: null,
    attendees: [],
    summary: "請求金額の調整",
    actionItems: [],
    details: null,
    createdById: ACTOR_ID,
    version: 1,
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-15"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 共通リセット
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.invoice = null;
  state.createdInteraction = null;
  state.createArgs = null;
  state.auditArgs = null;
});

// ---------------------------------------------------------------------------
// 正常系テスト
// ---------------------------------------------------------------------------

describe("createInvoiceAdjustment — 正常系", () => {
  it("請求が存在する場合、kind=note の Interaction が作成され ok: true が返る", async () => {
    state.invoice = makeInvoice();
    state.createdInteraction = makeInteraction();

    const result = await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "請求金額の調整",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.interaction.kind).toBe("note");
      expect(result.interaction.id).toBe(INTERACTION_ID);
    }
  });

  it("interactionRepository.create に kind: 'note' と invoiceId が渡される", async () => {
    state.invoice = makeInvoice();
    state.createdInteraction = makeInteraction();

    await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "請求金額の調整",
    });

    expect(state.createArgs).not.toBeNull();
    expect(state.createArgs?.kind).toBe("note");
    expect(state.createArgs?.invoiceId).toBe(INVOICE_ID);
  });

  it("監査ログが interaction.create / targetType: interaction / metadata.kind: note で記録される", async () => {
    state.invoice = makeInvoice();
    state.createdInteraction = makeInteraction();

    await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "請求金額の調整",
    });

    expect(state.auditArgs).not.toBeNull();
    expect(state.auditArgs?.action).toBe("interaction.create");
    expect(state.auditArgs?.targetType).toBe("interaction");
    expect(state.auditArgs?.metadata).toEqual({ kind: "note" });
  });

  it("details（メモ）を指定した場合、notes フィールドとして repository に渡される", async () => {
    state.invoice = makeInvoice();
    state.createdInteraction = makeInteraction();

    await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "メモ付き調整",
      details: "請求に関する追加メモ",
    });

    expect(state.createArgs?.details).toEqual({
      notes: "請求に関する追加メモ",
      challenge: null,
      budget: null,
      decisionMaker: null,
      timeline: null,
      competitors: null,
    });
  });

  it("details を指定しない場合、details は null で渡される", async () => {
    state.invoice = makeInvoice();
    state.createdInteraction = makeInteraction();

    await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "メモなし調整",
    });

    expect(state.createArgs?.details).toBeNull();
  });

  it("date を指定した場合、その日付が使用される", async () => {
    state.invoice = makeInvoice();
    const specifiedDate = new Date("2026-06-10T14:00:00Z");
    state.createdInteraction = makeInteraction({ date: specifiedDate });

    await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "日付指定テスト",
      date: specifiedDate,
    });

    expect(state.createArgs?.date).toEqual(specifiedDate);
  });
});

// ---------------------------------------------------------------------------
// 異常系テスト
// ---------------------------------------------------------------------------

describe("createInvoiceAdjustment — 異常系", () => {
  it("請求が見つからない場合、ok: false が返る", async () => {
    state.invoice = null;

    const result = await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "請求金額の調整",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("請求が見つかりません");
    }
  });

  it("請求が見つからない場合、interactionRepository.create が呼ばれない", async () => {
    state.invoice = null;

    await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "請求金額の調整",
    });

    expect(state.createArgs).toBeNull();
  });

  it("請求が見つからない場合、監査ログが記録されない", async () => {
    state.invoice = null;

    await createInvoiceAdjustment({
      invoiceId: INVOICE_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "請求金額の調整",
    });

    expect(state.auditArgs).toBeNull();
  });
});
