import { listDeals } from "./listDeals";
import type { DealPhase, DealWithDetails } from "@/domain/models/deal";
import type { PipelineSummaryItem } from "@/domain/models/dashboard";

const ALL_PHASES: DealPhase[] = [
  "hearing",
  "proposal_prep",
  "proposed",
  "negotiation",
  "won",
  "lost",
  "passed",
];

export async function getPipelineSummary(
  organizationId: string
): Promise<{ summary: PipelineSummaryItem[]; deals: DealWithDetails[] }> {
  const deals = await listDeals(organizationId);

  // Initialize counts for all phases
  const phaseMap = new Map<DealPhase, { count: number; totalAmount: number }>(
    ALL_PHASES.map((phase) => [phase, { count: 0, totalAmount: 0 }])
  );

  // Aggregate deals by phase
  for (const deal of deals) {
    const entry = phaseMap.get(deal.phase);
    if (entry) {
      entry.count += 1;
      entry.totalAmount += deal.estimatedAmount ?? 0;
    }
  }

  // Convert to array preserving phase order
  const summary: PipelineSummaryItem[] = ALL_PHASES.map((phase) => {
    const entry = phaseMap.get(phase)!;
    return {
      phase,
      count: entry.count,
      totalAmount: entry.totalAmount,
    };
  });

  return { summary, deals };
}
