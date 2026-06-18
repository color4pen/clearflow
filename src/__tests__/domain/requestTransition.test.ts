import { describe, it, expect } from "bun:test";
import { validateTransition } from "@/domain/services/requestTransition";

describe("validateTransition — state transition rules", () => {
  /**
   * TC-001: draft から pending への遷移が許可される
   */
  it("TC-001: allows draft → pending", () => {
    const result = validateTransition("draft", "pending");
    expect(result.ok).toBe(true);
  });

  /**
   * TC-002: pending から approved への遷移が許可される
   */
  it("TC-002: allows pending → approved", () => {
    const result = validateTransition("pending", "approved");
    expect(result.ok).toBe(true);
  });

  /**
   * TC-003: pending から rejected への遷移が許可される
   */
  it("TC-003: allows pending → rejected", () => {
    const result = validateTransition("pending", "rejected");
    expect(result.ok).toBe(true);
  });

  /**
   * TC-004: 定義外の遷移 (draft → approved) が拒否される
   */
  it("TC-004: rejects draft → approved (undefined transition)", () => {
    const result = validateTransition("draft", "approved");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
      expect(typeof result.reason).toBe("string");
    }
  });

  /**
   * TC-005: 終端状態 (approved) からの遷移が拒否される
   */
  it("TC-005: rejects approved → pending (terminal state)", () => {
    const result = validateTransition("approved", "pending");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("approved");
    }
  });

  /**
   * TC-006: pending から revision への遷移が許可される（差し戻し）
   */
  it("TC-006: allows pending → revision", () => {
    const result = validateTransition("pending", "revision");
    expect(result.ok).toBe(true);
  });

  /**
   * TC-007: revision から pending への遷移が許可される（再申請）
   */
  it("TC-007: allows revision → pending", () => {
    const result = validateTransition("revision", "pending");
    expect(result.ok).toBe(true);
  });

  /**
   * TC-008: revision から approved への遷移が拒否される
   */
  it("TC-008: rejects revision → approved", () => {
    const result = validateTransition("revision", "approved");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
    }
  });

  /**
   * TC-009: revision から rejected への遷移が拒否される
   */
  it("TC-009: rejects revision → rejected", () => {
    const result = validateTransition("revision", "rejected");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
    }
  });

  /**
   * TC-010: pending から expired への遷移が許可される
   */
  it("TC-010: allows pending → expired", () => {
    const result = validateTransition("pending", "expired");
    expect(result.ok).toBe(true);
  });

  /**
   * TC-011: expired から pending への遷移が拒否される（終端状態）
   */
  it("TC-011: rejects expired → pending (terminal state)", () => {
    const result = validateTransition("expired", "pending");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
    }
  });

  /**
   * TC-012: expired から approved への遷移が拒否される
   */
  it("TC-012: rejects expired → approved (terminal state)", () => {
    const result = validateTransition("expired", "approved");
    expect(result.ok).toBe(false);
  });

  /**
   * TC-013: expired から rejected への遷移が拒否される
   */
  it("TC-013: rejects expired → rejected (terminal state)", () => {
    const result = validateTransition("expired", "rejected");
    expect(result.ok).toBe(false);
  });
});
