export type ActionItemStatus = "todo" | "in_progress" | "done";

export const ACTION_ITEM_STATUSES = ["todo", "in_progress", "done"] as const;

export type ActionItem = {
  id: string;
  organizationId: string;
  description: string;
  assigneeId: string | null;
  dueDate: Date | null;
  done: boolean;
  status: ActionItemStatus;
  interactionId: string | null;
  dealId: string | null;
  inquiryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};
