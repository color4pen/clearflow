// 商談（Meeting）は kind=meeting の 顧客接点（Interaction）として一般化された。
// このファイルは後方互換のために Interaction 型を Meeting として再エクスポートする。

export type {
  MeetingType,
  HearingData,
  LegacyMeetingActionItem,
  MeetingAttendee,
  InteractionKind,
  Interaction,
} from "./interaction";

// Meeting は Interaction の別名（kind=meeting の顧客接点）
export type { Interaction as Meeting } from "./interaction";

// 旧 ActionItem（JSONB 構造）は LegacyMeetingActionItem に改名。後方互換のみ。
export type { LegacyMeetingActionItem as ActionItem } from "./interaction";
