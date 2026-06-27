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

export type MeetingAttendee = {
  userId: string | null;
  contactId: string | null;
  name: string;
  isExternal: boolean;
};

export type Meeting = {
  id: string;
  organizationId: string;
  dealId: string | null;
  inquiryId: string | null;
  type: MeetingType;
  date: Date;
  location: string | null;
  attendees: MeetingAttendee[];
  summary: string | null;
  actionItems: ActionItem[];
  hearingData: HearingData | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};
