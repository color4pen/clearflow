import { describe, it, expect } from "bun:test";
import { ACTIVITY_TIMELINE_LIMIT, getHiddenActions, isActivityFeedEnabled } from "@/lib/activityConfig";

describe("activityConfig", () => {
  it("ACTIVITY_TIMELINE_LIMIT が 30 である", () => {
    expect(ACTIVITY_TIMELINE_LIMIT).toBe(30);
  });

  it("getHiddenActions() の戻り値が配列である", () => {
    const result = getHiddenActions();
    expect(Array.isArray(result)).toBe(true);
  });

  it("isActivityFeedEnabled() の戻り値が boolean である", () => {
    const result = isActivityFeedEnabled();
    expect(typeof result).toBe("boolean");
  });
});
