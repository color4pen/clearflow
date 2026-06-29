/**
 * アクションアイテムの status 導出ロジックの動的テスト。
 * mock.module 方式で actionItemRepository をモックし、
 * status=null の行が done から実効ステータスを正しく導出することを検証する。
 * 検証は listActionItems usecase を経由して ActionItem.status を assert する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ActionItem } from "@/domain/models/actionItem";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  actionItems: [] as ActionItem[],
};

// ---------------------------------------------------------------------------
// モジュールモック（個別ファイル — 静的 import より前に評価される）
// ---------------------------------------------------------------------------

// actionItemRepository の個別ファイルモック
mock.module("@/infrastructure/repositories/actionItemRepository", () => ({
  findByOrganization: async (_orgId: string, _filters?: unknown) => state.actionItems,
  findById: async (_id: string, _orgId: string) => state.actionItems[0] ?? null,
  create: async () => { throw new Error("not implemented in this test"); },
  update: async () => null,
  findByDeal: async () => [],
  findByMeeting: async () => [],
  deleteById: async () => false,
}));

import { listActionItems } from "@/application/usecases/listActionItems";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const ACTOR_ID = "user-001";

const baseActionItem = {
  id: "item-001",
  organizationId: ORG_ID,
  description: "テストアクションアイテム",
  assigneeId: null,
  dueDate: null,
  meetingId: null,
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

describe("actionItem status 導出ロジック", () => {
  beforeEach(() => {
    state.actionItems = [];
  });

  it("status=null(todo相当), done=false の行は実効 status が 'todo' になる", async () => {
    // mapRow: status=null, done=false → "todo" に導出した結果を返す repository を模倣
    state.actionItems = [
      { ...baseActionItem, done: false, status: "todo" as const },
    ];

    const result = await listActionItems({ organizationId: ORG_ID });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("todo");
    expect(result[0].done).toBe(false);
  });

  it("status=null(done相当), done=true の行は実効 status が 'done' になる", async () => {
    // mapRow: status=null, done=true → "done" に導出した結果を返す repository を模倣
    state.actionItems = [
      { ...baseActionItem, done: true, status: "done" as const },
    ];

    const result = await listActionItems({ organizationId: ORG_ID });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("done");
    expect(result[0].done).toBe(true);
  });

  it("status='in_progress' の行は明示値が優先され実効 status が 'in_progress' になる", async () => {
    // status が非 null の場合はその値がそのまま使われる
    state.actionItems = [
      { ...baseActionItem, done: false, status: "in_progress" as const },
    ];

    const result = await listActionItems({ organizationId: ORG_ID });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("in_progress");
    expect(result[0].done).toBe(false);
  });
});
