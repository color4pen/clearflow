import type { DealPhase } from "./deal";

export type DashboardActionItem =
  | {
      type: "approval";
      requestId: string;
      requestTitle: string;
      approverRole: string;
      deadline: Date | null;
    }
  | {
      type: "action_item";
      dealId: string | null;
      dealTitle: string;
      description: string;
      assigneeId: string | null;
      dueDate: string | null;
    }
  | {
      type: "inquiry";
      inquiryId: string;
      inquiryTitle: string;
      createdAt: Date;
    };

export type PipelineSummaryItem = {
  phase: DealPhase;
  count: number;
  totalAmount: number;
};
