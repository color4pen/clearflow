export type MeetingType = "hearing" | "proposal" | "negotiation" | "closing" | "followup";

export type HearingData = {
  challenge: string | null;
  budget: string | null;
  decisionMaker: string | null;
  timeline: string | null;
  competitors: string | null;
  notes: string | null;
};

/**
 * レガシー JSONB 構造のアクションアイテム。
 * action_items テーブル移行済みの旧フィールド（action_items カラム）で使用される。
 * ドメインエンティティの ActionItem（src/domain/models/actionItem.ts）とは別物であることに注意。
 */
export type LegacyMeetingActionItem = {
  description: string;
  assignee: string;
  dueDate: string | null;
  done: boolean;
};

export type MeetingAttendee = {
  userId: string | null;
  contactId: string | null;
  name: string;
  isExternal: boolean;
};

export type InteractionKind = "meeting" | "call" | "email" | "note";

/**
 * 顧客接点（Interaction）型。
 * kind によって関連先や details の内容が変わる。
 * - kind=meeting: meetingType が非 null、details は HearingData | null
 * - 将来 kind が増えた際は details を discriminated union で拡張する方針
 *   （例: details: HearingData | CallData | EmailData | null）
 */
export type Interaction = {
  id: string;
  organizationId: string;
  kind: InteractionKind;
  dealId: string | null;
  inquiryId: string | null;
  contractId: string | null;
  invoiceId: string | null;
  clientId: string | null;
  /** 商談種別。kind=meeting のときのみ非 null。 */
  meetingType: MeetingType | null;
  date: Date;
  location: string | null;
  attendees: MeetingAttendee[];
  summary: string | null;
  /** 商談の事前準備メモ。Markdown 対応。全商談種別で共通。 */
  preparation: string | null;
  /** レガシー JSONB フィールド。action_items テーブルに移行済み。 */
  actionItems: LegacyMeetingActionItem[];
  /** kind 固有データ。現時点では kind=meeting のみ対象（HearingData）。 */
  details: HearingData | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};
