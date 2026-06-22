export type InquiryStatus = "new" | "converted" | "declined";

export type InquirySource = "web" | "phone" | "referral" | "exhibition" | "other";

export type Inquiry = {
  id: string;
  organizationId: string;
  // 引き合い受付時点では顧客が未確定でもよいため nullable
  clientId: string | null;
  title: string;
  description: string | null;
  source: InquirySource;
  status: InquiryStatus;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type InquiryWithClient = Inquiry & {
  clientName: string | null;
};
