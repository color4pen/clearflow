import { describe, it, expect } from "bun:test";
import { validateContractAmount, validateContractDates } from "@/domain/services/contractValidation";

describe("validateContractAmount", () => {
  it("TC-001: amount = 0 がエラーになる", () => {
    const result = validateContractAmount(0);
    expect(result.ok).toBe(false);
  });

  it("TC-002: amount = -1 がエラーになる", () => {
    const result = validateContractAmount(-1);
    expect(result.ok).toBe(false);
  });

  it("TC-003: amount = 1 が許容される", () => {
    const result = validateContractAmount(1);
    expect(result).toEqual({ ok: true });
  });

  it("TC-004: amount = 100000 が許容される", () => {
    const result = validateContractAmount(100000);
    expect(result).toEqual({ ok: true });
  });
});

describe("validateContractDates", () => {
  it("TC-005: startDate > endDate がエラーになる", () => {
    const result = validateContractDates(new Date("2026-07-01"), new Date("2026-06-01"));
    expect(result.ok).toBe(false);
  });

  it("TC-006: startDate = endDate が許容される", () => {
    const result = validateContractDates(new Date("2026-07-01"), new Date("2026-07-01"));
    expect(result).toEqual({ ok: true });
  });

  it("TC-007: startDate < endDate が許容される", () => {
    const result = validateContractDates(new Date("2026-01-01"), new Date("2026-12-31"));
    expect(result).toEqual({ ok: true });
  });

  it("TC-008: endDate = null の場合は検証をスキップする", () => {
    const result = validateContractDates(new Date("2026-07-01"), null);
    expect(result).toEqual({ ok: true });
  });
});
