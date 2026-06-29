/**
 * findAllByContract / findAllByInvoice repository 関数の動的テスト。
 * mock.module を使ってリポジトリを差し替え、usecase の振る舞いを検証する。
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { mock } from "bun:test";
import type { Interaction } from "@/domain/models/interaction";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  contractInteractions: [] as Interaction[],
  invoiceInteractions: [] as Interaction[],
  lastFindByContractArgs: null as { contractId: string; organizationId: string } | null,
  lastFindByInvoiceArgs: null as { invoiceId: string; organizationId: string } | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories", () => ({
  interactionRepository: {
    findAllByContract: async (contractId: string, organizationId: string) => {
      state.lastFindByContractArgs = { contractId, organizationId };
      return state.contractInteractions;
    },
    findAllByInvoice: async (invoiceId: string, organizationId: string) => {
      state.lastFindByInvoiceArgs = { invoiceId, organizationId };
      return state.invoiceInteractions;
    },
  },
}));

import { listInteractionsByContract } from "@/application/usecases/listInteractionsByContract";
import { listInteractionsByInvoice } from "@/application/usecases/listInteractionsByInvoice";

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const CONTRACT_ID = "contract-001";
const INVOICE_ID = "invoice-001";

function makeInteraction(id: string, overrides: Partial<Interaction> = {}): Interaction {
  return {
    id,
    organizationId: ORG_ID,
    kind: "contract_adjustment",
    dealId: null,
    inquiryId: null,
    contractId: CONTRACT_ID,
    invoiceId: null,
    clientId: null,
    meetingType: null,
    date: new Date("2026-06-01"),
    location: null,
    attendees: [],
    summary: `やり取り ${id}`,
    actionItems: [],
    details: null,
    createdById: "actor-001",
    version: 1,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 共通リセット
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.contractInteractions = [];
  state.invoiceInteractions = [];
  state.lastFindByContractArgs = null;
  state.lastFindByInvoiceArgs = null;
});

// ---------------------------------------------------------------------------
// listInteractionsByContract テスト
// ---------------------------------------------------------------------------

describe("listInteractionsByContract — 契約に紐づく顧客接点の一覧取得", () => {
  it("findAllByContract の結果をそのまま返す", async () => {
    state.contractInteractions = [
      makeInteraction("i-001"),
      makeInteraction("i-002"),
      makeInteraction("i-003"),
    ];

    const result = await listInteractionsByContract(CONTRACT_ID, ORG_ID);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("i-001");
    expect(result[1].id).toBe("i-002");
    expect(result[2].id).toBe("i-003");
  });

  it("契約に紐づく顧客接点がない場合は空配列を返す", async () => {
    state.contractInteractions = [];

    const result = await listInteractionsByContract(CONTRACT_ID, ORG_ID);

    expect(result).toHaveLength(0);
  });

  it("findAllByContract に正しい contractId と organizationId が渡される", async () => {
    state.contractInteractions = [];

    await listInteractionsByContract(CONTRACT_ID, ORG_ID);

    expect(state.lastFindByContractArgs).not.toBeNull();
    expect(state.lastFindByContractArgs?.contractId).toBe(CONTRACT_ID);
    expect(state.lastFindByContractArgs?.organizationId).toBe(ORG_ID);
  });
});

// ---------------------------------------------------------------------------
// listInteractionsByInvoice テスト
// ---------------------------------------------------------------------------

describe("listInteractionsByInvoice — 請求に紐づく顧客接点の一覧取得", () => {
  it("findAllByInvoice の結果をそのまま返す", async () => {
    state.invoiceInteractions = [
      makeInteraction("i-101", { kind: "invoice_adjustment", contractId: null, invoiceId: INVOICE_ID }),
      makeInteraction("i-102", { kind: "invoice_adjustment", contractId: null, invoiceId: INVOICE_ID }),
    ];

    const result = await listInteractionsByInvoice(INVOICE_ID, ORG_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("i-101");
    expect(result[1].id).toBe("i-102");
  });

  it("請求に紐づく顧客接点がない場合は空配列を返す", async () => {
    state.invoiceInteractions = [];

    const result = await listInteractionsByInvoice(INVOICE_ID, ORG_ID);

    expect(result).toHaveLength(0);
  });

  it("findAllByInvoice に正しい invoiceId と organizationId が渡される", async () => {
    state.invoiceInteractions = [];

    await listInteractionsByInvoice(INVOICE_ID, ORG_ID);

    expect(state.lastFindByInvoiceArgs).not.toBeNull();
    expect(state.lastFindByInvoiceArgs?.invoiceId).toBe(INVOICE_ID);
    expect(state.lastFindByInvoiceArgs?.organizationId).toBe(ORG_ID);
  });
});
