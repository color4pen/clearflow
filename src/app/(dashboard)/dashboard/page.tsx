import { auth } from "@/infrastructure/auth";
import {
  listRequests,
  listInquiries,
  listDeals,
  listInvoicesByOrganization,
} from "@/application/usecases";
import {
  meetingRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import {
  buildActionableItems,
  buildPipelineSummary,
  filterStaleDeals,
  calcMonthlyRevenue,
} from "@/domain/services/dashboardService";
import { SalesDashboard } from "./SalesDashboard";
import { FinanceDashboard } from "./FinanceDashboard";
import { TOOLBAR } from "../styles";

export default async function DashboardPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const role = session!.user.role;

  if (role === "finance") {
    // 経理ダッシュボード
    const now = new Date();
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const twoMonthsEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));

    const [overdueInvoices, unpaidInvoices, paidInvoices, upcomingInvoices] = await Promise.all([
      listInvoicesByOrganization({ organizationId, status: "overdue" }),
      listInvoicesByOrganization({ organizationId, status: "invoiced" }),
      listInvoicesByOrganization({
        organizationId,
        status: "paid",
        paidAtFrom: thisMonthStart,
        paidAtTo: nextMonthStart,
      }),
      listInvoicesByOrganization({
        organizationId,
        status: "scheduled",
        issueDateFrom: thisMonthStart,
        issueDateTo: twoMonthsEnd,
      }),
    ]);

    const monthlyRevenue = calcMonthlyRevenue(paidInvoices);

    return (
      <div>
        <div className={`${TOOLBAR} mb-2`}>
          <span className="text-sm font-bold text-[#333333]">ダッシュボード</span>
          <span className="text-xs text-text-secondary ml-2">経理</span>
        </div>
        <FinanceDashboard
          overdueInvoices={overdueInvoices}
          unpaidInvoices={unpaidInvoices}
          monthlyRevenue={monthlyRevenue}
          upcomingInvoices={upcomingInvoices}
        />
      </div>
    );
  }

  // 営業ダッシュボード (member / manager / admin)
  const [requests, meetings, inquiries, deals, recentLogs] = await Promise.all([
    listRequests(organizationId),
    meetingRepository.findAllByOrganization(organizationId),
    listInquiries(organizationId),
    listDeals(organizationId),
    auditLogRepository.findByOrganization(organizationId, { limit: 20 }),
  ]);

  const actionItems = buildActionableItems({ requests, userRole: role, meetings, inquiries });
  const pipelineSummary = buildPipelineSummary(deals);
  const staleDeals =
    role === "manager" || role === "admin"
      ? filterStaleDeals(deals, new Date(), 14)
      : null;

  return (
    <div>
      <div className={`${TOOLBAR} mb-2`}>
        <span className="text-sm font-bold text-[#333333]">ダッシュボード</span>
        <span className="text-xs text-text-secondary ml-2">営業</span>
      </div>
      <SalesDashboard
        actionItems={actionItems}
        pipelineSummary={pipelineSummary}
        recentLogs={recentLogs}
        staleDeals={staleDeals}
        userRole={role}
      />
    </div>
  );
}
