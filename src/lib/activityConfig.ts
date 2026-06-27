export const ACTIVITY_TIMELINE_LIMIT = 30;

export const DEFAULT_HIDDEN_ACTIONS: string[] = [];

export function getHiddenActions(): string[] {
  const env = process.env.ACTIVITY_HIDDEN_ACTIONS;
  if (!env) {
    return DEFAULT_HIDDEN_ACTIONS;
  }
  return env.split(",").map((s) => s.trim()).filter(Boolean);
}

export function isActivityFeedEnabled(): boolean {
  return process.env.ACTIVITY_FEED_ENABLED === "true";
}
