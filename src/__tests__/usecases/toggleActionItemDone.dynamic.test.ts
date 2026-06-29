/**
 * toggleActionItemDone usecase の動的テスト（F-01）。
 * done のトグルに伴い status が "done"/"todo" に同期されること、
 * 監査が action_item.toggle / metadata.done のままであることを検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ActionItem } from "@/domain/models/actionItem";

const state = {
  existing: null as ActionItem | null,
  updateArgs: null as Record<string, unknown> | null,
  auditArgs: null as Record<string, unknown> | null,
};

// DB: transaction を即時実行するモック
mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

// actionItemRepository の個別ファイルモック（update 引数を捕捉）
mock.module("@/infrastructure/repositories/actionItemRepository", () => ({
  findById: async (_id: string, _org: string) => state.existing,
  update: async (_id: string, _org: string, data: Record<string, unknown>) => {
    state.updateArgs = data;
    return { ...(state.existing as ActionItem), ...data };
  },
  create: async () => { throw new Error("not implemented in this test"); },
  findByOrganization: async () => [],
  findByDeal: async () => [],
  findByMeeting: async () => [],
  deleteById: async () => false,
}));

// recordAudit の捕捉
mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (args: Record<string, unknown>) => {
    state.auditArgs = args;
  },
}));

import { toggleActionItemDone } from "@/application/usecases/toggleActionItemDone";

const base: ActionItem = {
  id: "item-001",
  organizationId: "org-001",
  description: "テスト",
  assigneeId: null,
  dueDate: null,
  done: false,
  status: "todo",
  interactionId: null,
  dealId: null,
  inquiryId: null,
  createdById: "user-001",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

describe("toggleActionItemDone — done と status の同期", () => {
  beforeEach(() => {
    state.existing = null;
    state.updateArgs = null;
    state.auditArgs = null;
  });

  it("done=false → true のとき status が 'done' に同期される", async () => {
    state.existing = { ...base, done: false, status: "todo" };
    const result = await toggleActionItemDone({
      id: "item-001",
      organizationId: "org-001",
      actorId: "user-001",
    });
    expect(result.ok).toBe(true);
    expect(state.updateArgs?.done).toBe(true);
    expect(state.updateArgs?.status).toBe("done");
  });

  it("done=true → false のとき status が 'todo' に同期される", async () => {
    state.existing = { ...base, done: true, status: "done" };
    const result = await toggleActionItemDone({
      id: "item-001",
      organizationId: "org-001",
      actorId: "user-001",
    });
    expect(result.ok).toBe(true);
    expect(state.updateArgs?.done).toBe(false);
    expect(state.updateArgs?.status).toBe("todo");
  });

  it("監査は action_item.toggle / metadata.done のまま", async () => {
    state.existing = { ...base, done: false, status: "todo" };
    await toggleActionItemDone({
      id: "item-001",
      organizationId: "org-001",
      actorId: "user-001",
    });
    expect(state.auditArgs?.action).toBe("action_item.toggle");
    expect((state.auditArgs?.metadata as { done: boolean })?.done).toBe(true);
  });
});
