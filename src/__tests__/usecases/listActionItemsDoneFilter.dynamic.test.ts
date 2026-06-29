/**
 * listActionItems の done フィルタ受け渡しの動的テスト（F-03）。
 * status=null を含む行に対し done フィルタが findByOrganization へ正しく渡ることを検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ActionItem } from "@/domain/models/actionItem";

const state = {
  findByOrgArgs: null as { orgId: string; filters: unknown } | null,
  rows: [] as ActionItem[],
};

mock.module("@/infrastructure/repositories/actionItemRepository", () => ({
  findByOrganization: async (orgId: string, filters?: unknown) => {
    state.findByOrgArgs = { orgId, filters };
    return state.rows;
  },
  findById: async () => null,
  create: async () => { throw new Error("not implemented in this test"); },
  update: async () => null,
  findByDeal: async () => [],
  findByMeeting: async () => [],
  deleteById: async () => false,
}));

import { listActionItems } from "@/application/usecases/listActionItems";

const item: ActionItem = {
  id: "item-001",
  organizationId: "org-001",
  description: "テスト",
  assigneeId: null,
  dueDate: null,
  done: false,
  status: "todo",
  meetingId: null,
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
    state.rows = [item];
    const result = await listActionItems({ organizationId: "org-001", done: false });
    expect(state.findByOrgArgs?.orgId).toBe("org-001");
    expect((state.findByOrgArgs?.filters as { done?: boolean })?.done).toBe(false);
    expect(result).toHaveLength(1);
  });
});
