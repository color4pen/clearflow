export type ContractStatus = "active" | "completed" | "cancelled";

export type RenewalType = "one_time" | "recurring";

export type Contract = {
  id: string;
  organizationId: string;
  dealId: string;
  clientId: string;
  title: string;
  contractType: string | null;
  amount: number;
  startDate: Date;
  endDate: Date | null;
  paymentTerms: string | null;
  renewalType: RenewalType;
  renewalCycle: string | null;
  status: ContractStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

/** 一覧表示用: クライアント名と案件名を含む */
export type ContractWithClient = Contract & { clientName: string; dealTitle: string };
