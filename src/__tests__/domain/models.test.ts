import { describe, it, expect } from "bun:test";
import type { RequestStatus } from "@/domain/models/request";

describe("Domain models", () => {
  /**
   * TC-032: RequestStatus 型が正しい union 型として定義されている
   */
  it("TC-032: RequestStatus contains all expected status values", () => {
    // Verify all expected values are assignable to RequestStatus
    const statuses: RequestStatus[] = [
      "draft",
      "pending",
      "approved",
      "rejected",
    ];
    expect(statuses).toContain("draft");
    expect(statuses).toContain("pending");
    expect(statuses).toContain("approved");
    expect(statuses).toContain("rejected");
    expect(statuses.length).toBe(4);
  });
});
