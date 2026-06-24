import { revenueRepository } from "@/infrastructure/repositories";
import type { MonthlyRevenue, CustomerRevenue, PipelineSummary } from "@/domain/models/revenue";

export type RevenueDashboard = {
  currentMonthRevenue: MonthlyRevenue[];
  monthlyTrend: MonthlyRevenue[];
  pipelineSummary: PipelineSummary[];
  topCustomers: CustomerRevenue[];
};

export async function getRevenueDashboard(data: {
  organizationId: string;
}): Promise<RevenueDashboard> {
  const { organizationId } = data;
  const now = new Date();

  // 今月の開始日・終了日
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // 12 ヶ月前の開始日
  const twelveMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [currentMonthRevenue, monthlyTrend, pipelineSummary, topCustomers] = await Promise.all([
    revenueRepository.getMonthlyRevenue(organizationId, currentMonthStart, currentMonthEnd),
    revenueRepository.getMonthlyRevenue(organizationId, twelveMonthsAgoStart, currentMonthEnd),
    revenueRepository.getPipelineSummary(organizationId),
    revenueRepository.getCustomerRevenue(organizationId, twelveMonthsAgoStart, currentMonthEnd, 10),
  ]);

  return {
    currentMonthRevenue,
    monthlyTrend,
    pipelineSummary,
    topCustomers,
  };
}
