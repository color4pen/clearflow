/**
 * 顧客接点（Interaction）に紐づくアクションアイテムの動的テスト。
 * mock.module を使って DB に依存せず、listActionItemsByMeeting / createActionItem の
 * 振る舞いを検証する。
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { mock } from "bun:test";
import type { Interaction } from "@/domain/models/interaction";
import type { ActionItem } from "@/domain/models/actionItem";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  interaction: null as Interaction | null,
  actionItems: [] as ActionItem[],
  createdActionItem: null as ActionItem | null,
  findByInteractionArgs: null as { interactionId: string; organizationId: string } | null,
  createArgs: null as Record<string, unknown> | null,
  auditArgs: null as Record<string, unknown> | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories/interactionRepository", () => ({
  findById: async () => state.interaction,
}));

mock.module("@/infrastructure/repositories/actionItemRepository", () => ({
  findByInteraction: async (interactionId: string, organizationId: string) => {
    state.findByInteractionArgs = { interactionId, organizationId };
    return state.actionItems;
  },
  create: async (data: Record<string, unknown>) => {
    state.createArgs = data;
    return state.createdActionItem!;
  },
}));

mock.module("@/infrastructure/repositories/dealRepository", () => ({
  findById: async () => null,
}));

mock.module("@/infrastructure/repositories/inquiryRepository", () => ({
  findById: async () => null,
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (args: Record<string, unknown>) => {
    state.auditArgs = args;
  },
}));

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { listActionItemsByMeeting } from "@/application/usecases/listActionItemsByMeeting";
import { createActionItem } from "@/application/usecases/createActionItem";

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const INTERACTION_ID = "interaction-001";
const ACTOR_ID = "actor-001";

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: INTERACTION_ID,
    organizationId: ORG_ID,
    kind: "meeting",
    dealId: "deal-001",
    inquiryId: null,
    contractId: null,
    invoiceId: null,
    clientId: null,
    meetingType: "hearing",
    date: new Date("2026-01-15T10:00:00Z"),
    location: null,
    attendees: [],
    summary: null,
    preparation: null,
    actionItems: [],
    details: null,
    createdById: ACTOR_ID,
    version: 1,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

function makeActionItem(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "action-001",
    organizationId: ORG_ID,
    description: "テストアクションアイテム",
    assigneeId: null,
    dueDate: null,
    done: false,
    status: "todo",
    interactionId: INTERACTION_ID,
    dealId: null,
    inquiryId: null,
    createdById: ACTOR_ID,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    version: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 共通リセット
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.interaction = null;
  state.actionItems = [];
  state.createdActionItem = null;
  state.findByInteractionArgs = null;
  state.createArgs = null;
  state.auditArgs = null;
});

// ---------------------------------------------------------------------------
// listActionItemsByMeeting テスト
// ---------------------------------------------------------------------------

describe("listActionItemsByMeeting — interactionId でアクションアイテム取得", () => {
  it("Interaction が存在する場合に actionItemRepository.findByInteraction で取得する", async () => {
    state.interaction = makeInteraction();
    state.actionItems = [makeActionItem()];

    const result = await listActionItemsByMeeting({
      meetingId: INTERACTION_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actionItems).toHaveLength(1);
      expect(result.actionItems[0].interactionId).toBe(INTERACTION_ID);
    }
  });

  it("findByInteraction に正しい interactionId と organizationId が渡される", async () => {
    state.interaction = makeInteraction();
    state.actionItems = [];

    await listActionItemsByMeeting({
      meetingId: INTERACTION_ID,
      organizationId: ORG_ID,
    });

    expect(state.findByInteractionArgs).not.toBeNull();
    expect(state.findByInteractionArgs?.interactionId).toBe(INTERACTION_ID);
    expect(state.findByInteractionArgs?.organizationId).toBe(ORG_ID);
  });

  it("Interaction が存在しない場合に ok: false が返る", async () => {
    state.interaction = null;

    const result = await listActionItemsByMeeting({
      meetingId: INTERACTION_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("商談");
    }
  });
});

// ---------------------------------------------------------------------------
// createActionItem — interactionId 検証テスト
// ---------------------------------------------------------------------------

describe("createActionItem — interactionId による存在確認", () => {
  it("interactionId が指定された場合に interactionRepository.findById で存在確認する", async () => {
    state.interaction = makeInteraction();
    state.createdActionItem = makeActionItem();

    const result = await createActionItem({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      description: "テストアクション",
      interactionId: INTERACTION_ID,
    });

    expect(result.ok).toBe(true);
  });

  it("interactionId を指定したが Interaction が存在しない場合に ok: false が返る", async () => {
    state.interaction = null;

    const result = await createActionItem({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      description: "テストアクション",
      interactionId: INTERACTION_ID,
    });

    expect(result.ok).toBe(false);
  });

  it("createActionItem が actionItemRepository.create に interactionId を渡す", async () => {
    state.interaction = makeInteraction();
    state.createdActionItem = makeActionItem();

    await createActionItem({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      description: "テストアクション",
      interactionId: INTERACTION_ID,
    });

    expect(state.createArgs).not.toBeNull();
    expect(state.createArgs?.interactionId).toBe(INTERACTION_ID);
  });
});
