export type ActionItem = {
  id: string;
  organizationId: string;
  description: string;
  assigneeId: string | null;
  dueDate: Date | null;
  done: boolean;
  meetingId: string | null;
  dealId: string | null;
  inquiryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};
