import { describe, it, expect } from "bun:test";
import { validateInvoiceDates } from "@/domain/services/invoiceValidation";

describe("validateInvoiceDates", () => {
  it("TC-001: issueDate > dueDate がエラーになる", () => {
    const result = validateInvoiceDates(new Date("2026-08-01"), new Date("2026-07-01"));
    expect(result.ok).toBe(false);
  });

  it("TC-002: issueDate = dueDate が許容される", () => {
    const result = validateInvoiceDates(new Date("2026-07-01"), new Date("2026-07-01"));
    expect(result).toEqual({ ok: true });
  });

  it("TC-003: issueDate < dueDate が許容される", () => {
    const result = validateInvoiceDates(new Date("2026-07-01"), new Date("2026-08-01"));
    expect(result).toEqual({ ok: true });
  });

  it("TC-004: issueDate = null の場合は検証をスキップする", () => {
    const result = validateInvoiceDates(null, new Date("2026-07-01"));
    expect(result).toEqual({ ok: true });
  });
});
