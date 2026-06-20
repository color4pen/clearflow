export type DealPhase =
  | "proposal_prep"
  | "proposed"
  | "negotiation"
  | "internal_approval"
  | "won"
  | "lost";

export type ContractType = "quasi_delegation" | "contract" | "ses";

export type Deal = {
  id: string;
  organizationId: string;
  inquiryId: string;
  title: string;
  phase: DealPhase;
  estimatedAmount: number | null;
  estimatedStartDate: Date | null;
  estimatedEndDate: Date | null;
  contractType: ContractType | null;
  assigneeId: string | null;
  technicalLeadId: string | null;
  estimateRequestId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type DealWithInquiry = Deal & {
  inquiryTitle: string;
  clientName: string;
};
