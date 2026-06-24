import { revenueRepository, revenueTargetRepository } from "@/infrastructure/repositories";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

export type RevenueForecastItem = {
  target: RevenueTarget;
  actualAmount: number;
  progressRate: number;
  landingForecast: number;
};

export type RevenueForecastResult = {
  items: RevenueForecastItem[];
  pipelineTotal: number;
};

export async function getRevenueForecast(data: {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<RevenueForecastResult> {
  const { organizationId, periodStart, periodEnd } = data;

  const [targets, monthlyRevenue, pipelineSummary] = await Promise.all([
    revenueTargetRepository.findByOrganization(organizationId),
    revenueRepository.getMonthlyRevenue(organizationId, periodStart, periodEnd),
    revenueRepository.getPipelineSummary(organizationId),
  ]);

  // パイプライン見込み合計
  const pipelineTotal = pipelineSummary.reduce(
    (sum, item) => sum + item.estimatedAmount,
    0
  );

  // 実績合計金額
  const totalActual = monthlyRevenue.reduce((sum, item) => sum + item.amount, 0);

  // 対象期間の目標のみフィルタ
  const periodTargets = targets.filter((t) => {
    // 目標期間が指定期間と重複するものを含める
    return t.periodEnd > periodStart && t.periodStart < periodEnd;
  });

  const items: RevenueForecastItem[] = periodTargets.map((target) => {
    const progressRate = target.targetAmount > 0
      ? totalActual / target.targetAmount
      : 0;
    const landingForecast = totalActual + pipelineTotal;

    return {
      target,
      actualAmount: totalActual,
      progressRate,
      landingForecast,
    };
  });

  return {
    items,
    pipelineTotal,
  };
}
