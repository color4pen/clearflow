/**
 * createContractAdjustment usecase の動的テスト。
 * mock.module を使って実際のビジネスロジックを検証する。
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { mock } from "bun:test";
import type { Interaction } from "@/domain/models/interaction";
import type { Contract } from "@/domain/models/contract";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  contract: null as Contract | null,
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
  contractRepository: {
    findById: async () => state.contract,
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

import { createContractAdjustment } from "@/application/usecases/createContractAdjustment";

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const CONTRACT_ID = "contract-001";
const ACTOR_ID = "actor-001";
const INTERACTION_ID = "interaction-001";

function makeContract(): Contract {
  return {
    id: CONTRACT_ID,
    organizationId: ORG_ID,
    dealId: "deal-001",
    clientId: "client-001",
    title: "テスト契約",
    contractType: null,
    amount: 1000000,
    startDate: new Date("2026-01-01"),
    endDate: null,
    paymentTerms: null,
    renewalType: "one_time",
    renewalCycle: null,
    status: "active",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
  };
}

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: INTERACTION_ID,
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
    summary: "条件変更の交渉",
    actionItems: [],
    details: null,
    createdById: ACTOR_ID,
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
  state.contract = null;
  state.createdInteraction = null;
  state.createArgs = null;
  state.auditArgs = null;
});

// ---------------------------------------------------------------------------
// 正常系テスト
// ---------------------------------------------------------------------------

describe("createContractAdjustment — 正常系", () => {
  it("契約が存在する場合、kind=contract_adjustment の Interaction が作成され ok: true が返る", async () => {
    state.contract = makeContract();
    state.createdInteraction = makeInteraction();

    const result = await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "条件変更の交渉",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.interaction.kind).toBe("contract_adjustment");
      expect(result.interaction.id).toBe(INTERACTION_ID);
    }
  });

  it("interactionRepository.create に kind: 'contract_adjustment' と contractId が渡される", async () => {
    state.contract = makeContract();
    state.createdInteraction = makeInteraction();

    await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "条件変更の交渉",
    });

    expect(state.createArgs).not.toBeNull();
    expect(state.createArgs?.kind).toBe("contract_adjustment");
    expect(state.createArgs?.contractId).toBe(CONTRACT_ID);
  });

  it("監査ログが interaction.create / targetType: interaction / metadata.kind: contract_adjustment で記録される", async () => {
    state.contract = makeContract();
    state.createdInteraction = makeInteraction();

    await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "条件変更の交渉",
    });

    expect(state.auditArgs).not.toBeNull();
    expect(state.auditArgs?.action).toBe("interaction.create");
    expect(state.auditArgs?.targetType).toBe("interaction");
    expect(state.auditArgs?.metadata).toEqual({ kind: "contract_adjustment" });
  });

  it("details（メモ）を指定した場合、notes フィールドとして repository に渡される", async () => {
    state.contract = makeContract();
    state.createdInteraction = makeInteraction();

    await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "メモ付き調整",
      details: "追加メモの内容",
    });

    expect(state.createArgs?.details).toEqual({
      notes: "追加メモの内容",
      challenge: null,
      budget: null,
      decisionMaker: null,
      timeline: null,
      competitors: null,
    });
  });

  it("details を指定しない場合、details は null で渡される", async () => {
    state.contract = makeContract();
    state.createdInteraction = makeInteraction();

    await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "メモなし調整",
    });

    expect(state.createArgs?.details).toBeNull();
  });

  it("date を指定した場合、その日付が使用される", async () => {
    state.contract = makeContract();
    const specifiedDate = new Date("2026-05-15T10:00:00Z");
    state.createdInteraction = makeInteraction({ date: specifiedDate });

    await createContractAdjustment({
      contractId: CONTRACT_ID,
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

describe("createContractAdjustment — 異常系", () => {
  it("契約が見つからない場合、ok: false が返る", async () => {
    state.contract = null;

    const result = await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "条件変更の交渉",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("契約が見つかりません");
    }
  });

  it("契約が見つからない場合、interactionRepository.create が呼ばれない", async () => {
    state.contract = null;

    await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "条件変更の交渉",
    });

    expect(state.createArgs).toBeNull();
  });

  it("契約が見つからない場合、監査ログが記録されない", async () => {
    state.contract = null;

    await createContractAdjustment({
      contractId: CONTRACT_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "条件変更の交渉",
    });

    expect(state.auditArgs).toBeNull();
  });
});
