export type DealPhase =
  | "proposal_prep"
  | "proposed"
  | "negotiation"
  | "won"
  | "lost";

export type ContractType = "quasi_delegation" | "fixed_price" | "ses";

export type DealContactRole = "key_person" | "decision_maker" | "technical" | "other";

export type DealContact = {
  id: string;
  dealId: string;
  contactId: string;
  role: DealContactRole;
  createdAt: Date;
};

export type Deal = {
  id: string;
  organizationId: string;
  inquiryId: string | null;
  clientId: string;
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

export type DealWithDetails = Deal & {
  inquiryTitle: string | null;
  clientName: string;
  assigneeName: string | null;
};
