export type MeetingType = "hearing" | "proposal" | "negotiation" | "closing" | "followup";

export type HearingData = {
  challenge: string | null;
  budget: string | null;
  decisionMaker: string | null;
  timeline: string | null;
  competitors: string | null;
  notes: string | null;
};

export type ActionItem = {
  description: string;
  assignee: string;
  dueDate: string | null;
  done: boolean;
};

export type MeetingAttendees = {
  internal: string[];
  external: string[];
};

export type Meeting = {
  id: string;
  organizationId: string;
  // inquiryId と dealId のどちらか一方は必須（アプリケーション層で検証）
  inquiryId: string | null;
  dealId: string | null;
  type: MeetingType;
  date: Date;
  location: string | null;
  attendees: MeetingAttendees;
  summary: string | null;
  actionItems: ActionItem[];
  hearingData: HearingData | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};
