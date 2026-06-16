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
});
