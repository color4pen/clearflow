import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ACTIVITY_TIMELINE_LIMIT, getHiddenActions, isActivityFeedEnabled } from "@/lib/activityConfig";

describe("activityConfig", () => {
  // TC-025
  it("ACTIVITY_TIMELINE_LIMIT が 30 である", () => {
    expect(ACTIVITY_TIMELINE_LIMIT).toBe(30);
  });
});

describe("getHiddenActions()", () => {
  const originalHiddenActions = process.env.ACTIVITY_HIDDEN_ACTIONS;

  afterEach(() => {
    if (originalHiddenActions !== undefined) {
      process.env.ACTIVITY_HIDDEN_ACTIONS = originalHiddenActions;
    } else {
      delete process.env.ACTIVITY_HIDDEN_ACTIONS;
    }
  });

  // TC-026
  it("env 未設定のとき空配列を返す", () => {
    delete process.env.ACTIVITY_HIDDEN_ACTIONS;
    expect(getHiddenActions()).toEqual([]);
  });

  // TC-027
  it('env に "deal.view,meeting.view" が設定されているとき ["deal.view", "meeting.view"] を返す', () => {
    process.env.ACTIVITY_HIDDEN_ACTIONS = "deal.view,meeting.view";
    expect(getHiddenActions()).toEqual(["deal.view", "meeting.view"]);
  });

  // TC-028
  it("各要素が trim されている（前後の空白除去）", () => {
    process.env.ACTIVITY_HIDDEN_ACTIONS = "deal.view, meeting.view";
    expect(getHiddenActions()).toEqual(["deal.view", "meeting.view"]);
  });
});

describe("isActivityFeedEnabled()", () => {
  const originalFeedEnabled = process.env.ACTIVITY_FEED_ENABLED;

  afterEach(() => {
    if (originalFeedEnabled !== undefined) {
      process.env.ACTIVITY_FEED_ENABLED = originalFeedEnabled;
    } else {
      delete process.env.ACTIVITY_FEED_ENABLED;
    }
  });

  // TC-029
  it('ACTIVITY_FEED_ENABLED="true" のとき true を返す', () => {
    process.env.ACTIVITY_FEED_ENABLED = "true";
    expect(isActivityFeedEnabled()).toBe(true);
  });

  // TC-030
  it("ACTIVITY_FEED_ENABLED が未設定のとき false を返す", () => {
    delete process.env.ACTIVITY_FEED_ENABLED;
    expect(isActivityFeedEnabled()).toBe(false);
  });

  // TC-031
  it('ACTIVITY_FEED_ENABLED="false" のとき false を返す', () => {
    process.env.ACTIVITY_FEED_ENABLED = "false";
    expect(isActivityFeedEnabled()).toBe(false);
  });
});
