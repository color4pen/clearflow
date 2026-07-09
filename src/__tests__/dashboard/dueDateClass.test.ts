import { describe, it, expect } from "bun:test";
import { dueDateClass } from "@/app/(dashboard)/lib/dueDateClass";

describe("dueDateClass", () => {
  it("過去日（昨日）→ text-danger font-semibold", () => {
    const now = new Date("2024-06-15T12:00:00");
    const yesterday = new Date("2024-06-14T12:00:00");
    expect(dueDateClass(yesterday, now)).toBe("text-danger font-semibold");
  });

  it("当日（今日）→ text-warning font-semibold", () => {
    const now = new Date("2024-06-15T12:00:00");
    const today = new Date("2024-06-15T00:00:00");
    expect(dueDateClass(today, now)).toBe("text-warning font-semibold");
  });

  it("未来日（明日）→ 空文字", () => {
    const now = new Date("2024-06-15T12:00:00");
    const tomorrow = new Date("2024-06-16T12:00:00");
    expect(dueDateClass(tomorrow, now)).toBe("");
  });

  it("null → 空文字", () => {
    const now = new Date("2024-06-15T12:00:00");
    expect(dueDateClass(null, now)).toBe("");
  });

  it("文字列型の日付（過去）→ 正しく text-danger font-semibold", () => {
    const now = new Date("2024-06-15T12:00:00");
    expect(dueDateClass("2024-06-14", now)).toBe("text-danger font-semibold");
  });

  it("文字列型の日付（当日）→ 正しく text-warning font-semibold", () => {
    const now = new Date("2024-06-15T12:00:00");
    expect(dueDateClass("2024-06-15", now)).toBe("text-warning font-semibold");
  });

  it("日付境界: now が 2024-06-15T00:00:00 で date が 2024-06-15T00:00:00 → text-warning font-semibold（同一暦日）", () => {
    const now = new Date("2024-06-15T00:00:00");
    const date = new Date("2024-06-15T00:00:00");
    expect(dueDateClass(date, now)).toBe("text-warning font-semibold");
  });

  it("日付境界: now が 2024-06-15T23:59:59 で date が 2024-06-15T00:00:00 → text-warning font-semibold（同一暦日）", () => {
    const now = new Date("2024-06-15T23:59:59");
    const date = new Date("2024-06-15T00:00:00");
    expect(dueDateClass(date, now)).toBe("text-warning font-semibold");
  });

  it("now を渡さない場合は new Date() が使われる（未来の日付を渡すと空文字）", () => {
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100);
    expect(dueDateClass(farFuture)).toBe("");
  });
});
