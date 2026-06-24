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

  // 対象期間の目標のみフィルタ
  const periodTargets = targets.filter((t) => {
    // 目標期間が指定期間と重複するものを含める
    return t.periodEnd > periodStart && t.periodStart < periodEnd;
  });

  const items: RevenueForecastItem[] = periodTargets.map((target) => {
    // 各目標の periodStart〜periodEnd に対応する月次実績のみを集計する
    const targetStartYM = formatYearMonth(target.periodStart);
    const targetEndYM = formatYearMonth(target.periodEnd);
    const targetActual = monthlyRevenue
      .filter((m) => m.yearMonth >= targetStartYM && m.yearMonth <= targetEndYM)
      .reduce((sum, m) => sum + m.amount, 0);

    const progressRate = target.targetAmount > 0
      ? targetActual / target.targetAmount
      : 0;
    const landingForecast = targetActual + pipelineTotal;

    return {
      target,
      actualAmount: targetActual,
      progressRate,
      landingForecast,
    };
  });

  return {
    items,
    pipelineTotal,
  };
}

/**
 * Date を 'YYYY-MM' 形式の文字列に変換する
 */
function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
