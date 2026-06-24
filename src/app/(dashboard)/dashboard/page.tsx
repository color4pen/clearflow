import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { getDashboardActions, getPipelineSummary, getRecentActivities, listInvoicesByOrganization } from "@/application/usecases";
import { SalesDashboard } from "./SalesDashboard";
import { FinanceDashboard } from "./FinanceDashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const organizationId = session.user.organizationId;
  const userRole = session.user.role;

  if (userRole === "finance") {
    // Finance dashboard data
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const nextNextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));

    const [overdueInvoices, unpaidInvoices, paidInvoices, upcomingInvoices] =
      await Promise.all([
        listInvoicesByOrganization({ organizationId, status: "overdue" }),
        listInvoicesByOrganization({ organizationId, status: "invoiced" }),
        listInvoicesByOrganization({
          organizationId,
          status: "paid",
          paidAtFrom: monthStart,
          paidAtTo: nextMonthStart,
        }),
        listInvoicesByOrganization({
          organizationId,
          status: "scheduled",
          issueDateFrom: monthStart,
          issueDateTo: nextNextMonthStart,
        }),
      ]);

    const monthlySalesTotal = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    return (
      <FinanceDashboard
        overdueInvoices={overdueInvoices}
        unpaidInvoices={unpaidInvoices}
        monthlySalesTotal={monthlySalesTotal}
        upcomingInvoices={upcomingInvoices}
      />
    );
  }

  // Sales dashboard data
  const [actions, pipelineResult, recentActivities] = await Promise.all([
    getDashboardActions(organizationId, userRole),
    getPipelineSummary(organizationId),
    getRecentActivities(organizationId),
  ]);

  const { summary: pipelineSummary, deals } = pipelineResult;

  // Stale deals: non-terminal phase, updatedAt >= 14 days ago
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const staleDeals =
    userRole === "manager" || userRole === "admin"
      ? deals.filter(
          (deal) =>
            deal.phase !== "won" &&
            deal.phase !== "lost" &&
            deal.updatedAt <= fourteenDaysAgo
        )
      : null;

  return (
    <SalesDashboard
      actions={actions}
      pipelineSummary={pipelineSummary}
      recentActivities={recentActivities}
      staleDeals={staleDeals}
    />
  );
}
