import { auth } from "@/infrastructure/auth";
import { getRevenueDashboard } from "@/application/usecases";
import { PageToolbar, SectionCard, DataTable } from "@/app/components";
import { phaseLabels } from "@/app/(dashboard)/labels";
import type { CustomerRevenue } from "@/domain/models/revenue";

export default async function RevenueDashboardPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const dashboard = await getRevenueDashboard({ organizationId });

  const currentMonthTotal = dashboard.currentMonthRevenue.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const pipelineTotal = dashboard.pipelineSummary.reduce(
    (sum, item) => sum + item.estimatedAmount,
    0
  );

  return (
    <div>
      <PageToolbar title="売上ダッシュボード" />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">今月の入金確認済み合計</h2>
          <p className="text-2xl font-bold text-text">
            ¥{currentMonthTotal.toLocaleString("ja-JP")}
          </p>
        </SectionCard>

        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">パイプライン売上予測</h2>
          <p className="text-2xl font-bold text-text">
            ¥{pipelineTotal.toLocaleString("ja-JP")}
          </p>
          <div className="mt-2">
            {dashboard.pipelineSummary.length === 0 ? (
              <p className="text-xs text-text-muted">パイプラインデータなし</p>
            ) : (
              <ul className="text-xs text-text-muted space-y-1">
                {dashboard.pipelineSummary.map((item) => (
                  <li key={item.phase}>
                    {phaseLabels[item.phase] ?? item.phase}: {item.dealCount}件 ¥{item.estimatedAmount.toLocaleString("ja-JP")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="p-4 mt-2">
        <h2 className="text-sm font-semibold text-text-muted mb-2">月次売上推移（過去12ヶ月）</h2>
        {dashboard.monthlyTrend.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">データなし</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-text-muted">
                <th className="py-1 pr-4">期間</th>
                <th className="py-1 pr-4 text-right">金額</th>
                <th className="py-1 text-right">件数</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.monthlyTrend.map((item) => (
                <tr key={item.yearMonth} className="border-b">
                  <td className="py-1 pr-4">{item.yearMonth}</td>
                  <td className="py-1 pr-4 text-right">¥{item.amount.toLocaleString("ja-JP")}</td>
                  <td className="py-1 text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard className="p-4 mt-2">
        <h2 className="text-sm font-semibold text-text-muted mb-2">顧客別売上ランキング（上位10社）</h2>
        {dashboard.topCustomers.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">データなし</p>
        ) : (
          <DataTable<CustomerRevenue>
            columns={[
              {
                key: "clientName",
                header: "顧客名",
                render: (row) => row.clientName,
              },
              {
                key: "amount",
                header: "金額",
                align: "right",
                render: (row) => `¥${row.amount.toLocaleString("ja-JP")}`,
              },
              {
                key: "count",
                header: "件数",
                align: "right",
                render: (row) => String(row.count),
              },
            ]}
            rows={dashboard.topCustomers}
            rowKey={(row) => row.clientId}
          />
        )}
      </SectionCard>
    </div>
  );
}
