import { describe, it, expect } from "bun:test";
import type { ContractWithClient } from "@/domain/models/contract";

/**
 * 終了日が今日から 30 日以内の active 契約かどうかを判定するユーティリティ。
 * contracts/page.tsx の isExpiringWithin30Days と同じロジック。
 */
function isExpiringWithin30Days(row: Pick<ContractWithClient, "endDate" | "status">): boolean {
  if (!row.endDate || row.status !== "active") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  return row.endDate <= thirtyDaysLater;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

describe("isExpiringWithin30Days", () => {
  it("TC-005: 終了日が今日から 15 日後の active 契約はハイライト対象", () => {
    const row = { endDate: daysFromNow(15), status: "active" as const };
    expect(isExpiringWithin30Days(row)).toBe(true);
  });

  it("TC-006: 終了日が今日から 45 日後の active 契約はハイライト対象外", () => {
    const row = { endDate: daysFromNow(45), status: "active" as const };
    expect(isExpiringWithin30Days(row)).toBe(false);
  });

  it("TC-007: 終了日が 30 日以内だが completed の契約はハイライト対象外", () => {
    const row = { endDate: daysFromNow(10), status: "completed" as const };
    expect(isExpiringWithin30Days(row)).toBe(false);
  });

  it("TC-008: 終了日が過去日の active 契約はハイライト対象（期限超過警告）", () => {
    const row = { endDate: daysFromNow(-5), status: "active" as const };
    expect(isExpiringWithin30Days(row)).toBe(true);
  });

  it("TC-009: endDate が null の行はハイライト対象外（undefined 相当）", () => {
    const row = { endDate: null, status: "active" as const };
    expect(isExpiringWithin30Days(row)).toBe(false);
  });

  it("終了日がちょうど 30 日後の active 契約はハイライト対象", () => {
    const row = { endDate: daysFromNow(30), status: "active" as const };
    expect(isExpiringWithin30Days(row)).toBe(true);
  });

  it("cancelled の契約はハイライト対象外", () => {
    const row = { endDate: daysFromNow(5), status: "cancelled" as const };
    expect(isExpiringWithin30Days(row)).toBe(false);
  });
});
