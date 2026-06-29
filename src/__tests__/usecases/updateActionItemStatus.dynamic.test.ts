/**
 * updateActionItemStatus usecase の動的テスト。
 * mock.module 方式で repository 層と DB をモックし、
 * status 設定・done 同期・監査記録を検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ActionItem } from "@/domain/models/actionItem";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  existingActionItem: null as ActionItem | null,
  updatedActionItem: null as ActionItem | null,
  updateCallArgs: null as Record<string, unknown> | null,
  auditCreateArgs: null as Record<string, unknown> | null,
  throwOnUpdate: false,
};

// ---------------------------------------------------------------------------
// モジュールモック（個別ファイル — 静的 import より前に評価される）
// ---------------------------------------------------------------------------

// DB: transaction を即時実行するモック
mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({});
    },
  },
}));

// actionItemRepository の個別ファイルモック
mock.module("@/infrastructure/repositories/actionItemRepository", () => ({
  findById: async (_id: string, _orgId: string) => state.existingActionItem,
  update: async (
    _id: string,
    _orgId: string,
    data: Record<string, unknown>,
    _version: number,
    _tx?: unknown
  ) => {
    if (state.throwOnUpdate) throw new Error("update failed");
    state.updateCallArgs = data;
    return state.updatedActionItem;
  },
  create: async () => { throw new Error("not implemented in this test"); },
  findByOrganization: async () => [],
  findByDeal: async () => [],
  findByInteraction: async () => [],
  deleteById: async () => false,
}));

// auditRecorder を直接モック（auditLogRepository のバレル経由の干渉を避ける）
mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (data: Record<string, unknown>, _tx?: unknown) => {
    state.auditCreateArgs = data;
  },
}));

import { updateActionItemStatus } from "@/application/usecases/updateActionItemStatus";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const ACTOR_ID = "user-001";
const ITEM_ID = "item-001";

const baseActionItem: ActionItem = {
  id: ITEM_ID,
  organizationId: ORG_ID,
  description: "テストアクションアイテム",
  assigneeId: null,
  dueDate: null,
  done: false,
  status: "todo",
  interactionId: null,
  dealId: null,
  inquiryId: null,
  createdById: ACTOR_ID,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("updateActionItemStatus usecase", () => {
  beforeEach(() => {
    state.existingActionItem = null;
    state.updatedActionItem = null;
    state.updateCallArgs = null;
    state.auditCreateArgs = null;
    state.throwOnUpdate = false;
  });

  it("status=done で更新すると done=true に同期される", async () => {
    state.existingActionItem = { ...baseActionItem, status: "todo", done: false };
    state.updatedActionItem = { ...baseActionItem, status: "done", done: true };

    const result = await updateActionItemStatus({
      id: ITEM_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      status: "done",
    });

    expect(result.ok).toBe(true);
    expect(state.updateCallArgs).not.toBeNull();
    expect(state.updateCallArgs?.status).toBe("done");
    expect(state.updateCallArgs?.done).toBe(true);
  });

  it("status=in_progress で更新すると done=false に同期される", async () => {
    state.existingActionItem = { ...baseActionItem, status: "done", done: true };
    state.updatedActionItem = { ...baseActionItem, status: "in_progress", done: false };

    const result = await updateActionItemStatus({
      id: ITEM_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      status: "in_progress",
    });

    expect(result.ok).toBe(true);
    expect(state.updateCallArgs).not.toBeNull();
    expect(state.updateCallArgs?.status).toBe("in_progress");
    expect(state.updateCallArgs?.done).toBe(false);
  });

  it("status=todo で更新すると done=false に同期される", async () => {
    state.existingActionItem = { ...baseActionItem, status: "in_progress", done: false };
    state.updatedActionItem = { ...baseActionItem, status: "todo", done: false };

    const result = await updateActionItemStatus({
      id: ITEM_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      status: "todo",
    });

    expect(result.ok).toBe(true);
    expect(state.updateCallArgs).not.toBeNull();
    expect(state.updateCallArgs?.status).toBe("todo");
    expect(state.updateCallArgs?.done).toBe(false);
  });

  it("recordAudit が action_item.updateStatus + metadata.status で呼ばれる", async () => {
    state.existingActionItem = { ...baseActionItem, status: "todo", done: false };
    state.updatedActionItem = { ...baseActionItem, status: "in_progress", done: false };

    await updateActionItemStatus({
      id: ITEM_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      status: "in_progress",
    });

    expect(state.auditCreateArgs).not.toBeNull();
    expect(state.auditCreateArgs?.action).toBe("action_item.updateStatus");
    expect(state.auditCreateArgs?.targetType).toBe("action_item");
    expect(state.auditCreateArgs?.targetId).toBe(ITEM_ID);
    expect(state.auditCreateArgs?.actorId).toBe(ACTOR_ID);
    expect(state.auditCreateArgs?.organizationId).toBe(ORG_ID);
    expect((state.auditCreateArgs?.metadata as Record<string, unknown>)?.status).toBe("in_progress");
  });

  it("存在しない id では ok=false が返る", async () => {
    state.existingActionItem = null;

    const result = await updateActionItemStatus({
      id: "nonexistent-id",
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      status: "done",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("見つかりません");
    }
    expect(state.updateCallArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });
});
