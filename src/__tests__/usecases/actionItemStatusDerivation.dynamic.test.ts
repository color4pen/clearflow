/**
 * actionItem の status 導出ロジック（mapRow）の動的テスト。
 *
 * F-02 対応: repository をモックして「導出済みの値」を返す方式では mapRow が一度も
 * 実行されず、導出ロジックが壊れても検知できない（空洞テスト）。本テストは mapRow を
 * 直接 import し、生の行（status / done）を渡して実効ステータスの導出を実際に実行する。
 */

import { describe, it, expect } from "bun:test";
import { mapRow } from "@/infrastructure/repositories/actionItemRepository";
import { actionItems } from "@/infrastructure/schema";

// 生の DB 行（typeof actionItems.$inferSelect）を組み立てるヘルパ
function rawRow(
  overrides: Partial<typeof actionItems.$inferSelect>
): typeof actionItems.$inferSelect {
  return {
    id: "item-001",
    organizationId: "org-001",
    description: "テストアクションアイテム",
    assigneeId: null,
    dueDate: null,
    done: false,
    status: null,
    interactionId: null,
    dealId: null,
    inquiryId: null,
    createdById: "user-001",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
    ...overrides,
  };
}

describe("actionItemRepository.mapRow — status 導出", () => {
  it("status=null, done=false の行は実効 status が 'todo' に導出される", () => {
    const result = mapRow(rawRow({ status: null, done: false }));
    expect(result.status).toBe("todo");
    expect(result.done).toBe(false);
  });

  it("status=null, done=true の行は実効 status が 'done' に導出される", () => {
    const result = mapRow(rawRow({ status: null, done: true }));
    expect(result.status).toBe("done");
    expect(result.done).toBe(true);
  });

  it("status='in_progress'(明示) は done に関わらず優先される", () => {
    const result = mapRow(rawRow({ status: "in_progress", done: false }));
    expect(result.status).toBe("in_progress");
  });

  it("status='done'(明示) は done=false でも 'done' になる（明示値優先）", () => {
    const result = mapRow(rawRow({ status: "done", done: false }));
    expect(result.status).toBe("done");
  });
});
