export type InquiryStatus = "new" | "in_progress" | "converted" | "declined";

export type InquirySource = "web" | "phone" | "referral" | "exhibition" | "other";

export type Inquiry = {
  id: string;
  organizationId: string;
  clientId: string;
  contactId: string | null;
  title: string;
  description: string | null;
  source: InquirySource;
  status: InquiryStatus;
  assigneeId: string | null;
  requestId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InquiryWithClient = Inquiry & {
  clientName: string;
};
