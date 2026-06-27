import type { MeetingType } from "@/domain/models/meeting";

export const meetingTypeLabels: Record<MeetingType, string> & Record<string, string> = {
  hearing: "ヒアリング",
  proposal: "提案",
  negotiation: "交渉",
  closing: "クロージング",
  followup: "フォローアップ",
};
