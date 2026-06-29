import type { AuditAction } from "@/domain/models/auditLog";

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

/** タイムラインに表示する対象アクションのホワイトリスト（顧客接点 + 業務イベント） */
export const TIMELINE_ACTIONS: AuditAction[] = [
  "interaction.create",
  "meeting.create",
  "deal.create",
  "deal.updatePhase",
  "contract.create",
  "contract.updateStatus",
  "invoice.create",
  "invoice.update_status",
];

/** 状態遷移を伴うアクション（集約時に from→to を正味遷移に合成する） */
export const TRANSITION_ACTIONS: AuditAction[] = [
  "deal.updatePhase",
  "contract.updateStatus",
  "invoice.update_status",
];
