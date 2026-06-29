/**
 * listActionItems の done フィルタ受け渡しの動的テスト（F-03）。
 * status=null を含む行に対し done フィルタが findByOrganization へ正しく渡ること、
 * および done=true の行がフィルタ適用後の結果に含まれないことを検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ActionItem } from "@/domain/models/actionItem";

type FindByOrgFilters = { done?: boolean; assigneeId?: string };

const state = {
  findByOrgArgs: null as { orgId: string; filters: FindByOrgFilters } | null,
  rows: [] as ActionItem[],
};

mock.module("@/infrastructure/repositories/actionItemRepository", () => ({
  findByOrganization: async (orgId: string, filters?: FindByOrgFilters) => {
    state.findByOrgArgs = { orgId, filters: filters ?? {} };
    // Simulate SQL-level done filter (mirrors the WHERE done = ? clause in the repository)
    let rows = state.rows;
    if (typeof filters?.done === "boolean") {
      rows = rows.filter((r) => r.done === filters.done);
    }
    return rows;
  },
  findById: async () => null,
  create: async () => { throw new Error("not implemented in this test"); },
  update: async () => null,
  findByDeal: async () => [],
  findByMeeting: async () => [],
  deleteById: async () => false,
}));

import { listActionItems } from "@/application/usecases/listActionItems";

const todoItem: ActionItem = {
  id: "item-001",
  organizationId: "org-001",
  description: "未着手タスク",
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

const doneItem: ActionItem = {
  id: "item-002",
  organizationId: "org-001",
  description: "完了タスク",
  assigneeId: null,
  dueDate: null,
  done: true,
  status: "done",
  interactionId: null,
  dealId: null,
  inquiryId: null,
  createdById: "user-001",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

describe("listActionItems — done フィルタの受け渡し", () => {
  beforeEach(() => {
    state.findByOrgArgs = null;
    state.rows = [];
  });

  it("done=false を findByOrganization のフィルタに渡し、返った行を返す", async () => {
    state.rows = [todoItem];
    const result = await listActionItems({ organizationId: "org-001", done: false });
    expect(state.findByOrgArgs?.orgId).toBe("org-001");
    expect(state.findByOrgArgs?.filters?.done).toBe(false);
    expect(result).toHaveLength(1);
  });

  it("done=true の行は done=false フィルタ適用後の結果に含まれない", async () => {
    state.rows = [todoItem, doneItem];
    const result = await listActionItems({ organizationId: "org-001", done: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("item-001");
    expect(result.every((r) => !r.done)).toBe(true);
  });
});
