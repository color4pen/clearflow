import { revenueRepository } from "@/infrastructure/repositories";
import type { MonthlyRevenue, CustomerRevenue, DealRevenue } from "@/domain/models/revenue";

export type RevenueAxis = "monthly" | "customer" | "deal";

export type RevenueDetailsResult =
  | { axis: "monthly"; data: MonthlyRevenue[] }
  | { axis: "customer"; data: CustomerRevenue[] }
  | { axis: "deal"; data: DealRevenue[] };

export async function getRevenueDetails(data: {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  axis: RevenueAxis;
}): Promise<RevenueDetailsResult> {
  const { organizationId, startDate, endDate, axis } = data;

  if (axis === "monthly") {
    const result = await revenueRepository.getMonthlyRevenue(organizationId, startDate, endDate);
    return { axis: "monthly", data: result };
  }

  if (axis === "customer") {
    const result = await revenueRepository.getCustomerRevenue(organizationId, startDate, endDate);
    return { axis: "customer", data: result };
  }

  // axis === "deal"
  const result = await revenueRepository.getDealRevenue(organizationId, startDate, endDate);
  return { axis: "deal", data: result };
}
