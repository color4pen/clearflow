import type { DealPhase } from "./deal";

export type MonthlyRevenue = {
  yearMonth: string;
  amount: number;
  count: number;
};

export type CustomerRevenue = {
  clientId: string;
  clientName: string;
  amount: number;
  count: number;
};

export type DealRevenue = {
  dealId: string;
  dealTitle: string;
  amount: number;
  count: number;
};

export type PipelineSummary = {
  phase: DealPhase;
  dealCount: number;
  estimatedAmount: number;
};
