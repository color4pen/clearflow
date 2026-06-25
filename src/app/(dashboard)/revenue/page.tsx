import Link from "next/link";
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

  const maxTrendAmount = Math.max(
    ...dashboard.monthlyTrend.map((i) => i.amount),
    1
  );

  return (
    <div>
      <PageToolbar title="売上ダッシュボード" />

      {/* KPI カード: 3 カラム */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">今月の売上</h2>
          <p className="text-2xl font-bold text-success">
            ¥{currentMonthTotal.toLocaleString("ja-JP")}
          </p>
        </SectionCard>

        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">確定見込み</h2>
          <p className="text-2xl font-bold text-text">
            ¥{dashboard.confirmedRevenue.toLocaleString("ja-JP")}
          </p>
          <p className="text-xs text-text-muted mt-1">契約・請求予定の金額</p>
        </SectionCard>

        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">パイプライン見込み</h2>
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

      {/* 月次売上推移 */}
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
                <th className="py-1 pr-4 text-right">件数</th>
                <th className="py-1">推移</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.monthlyTrend.map((item) => {
                const [year, month] = item.yearMonth.split("-");
                const lastDay = new Date(Number(year), Number(month), 0).getDate();
                const href = `/revenue/details?startDate=${item.yearMonth}-01&endDate=${item.yearMonth}-${String(lastDay).padStart(2, "0")}&axis=monthly`;
                const barWidth = `${(item.amount / maxTrendAmount) * 100}%`;
                return (
                  <tr
                    key={item.yearMonth}
                    className="border-b cursor-pointer hover:bg-primary/10"
                  >
                    <td className="py-1 pr-4">
                      <Link href={href} className="block w-full h-full">
                        {item.yearMonth}
                      </Link>
                    </td>
                    <td className="py-1 pr-4 text-right">
                      <Link href={href} className="block w-full h-full">
                        ¥{item.amount.toLocaleString("ja-JP")}
                      </Link>
                    </td>
                    <td className="py-1 pr-4 text-right">
                      <Link href={href} className="block w-full h-full">
                        {item.count}
                      </Link>
                    </td>
                    <td className="py-1 w-32">
                      <div className="bg-gray-100 rounded h-3 w-full">
                        <div
                          className="bg-primary h-3 rounded"
                          style={{ width: barWidth }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* 顧客別売上ランキング */}
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
            rowHref={(row) => `/clients/${row.clientId}`}
          />
        )}
      </SectionCard>
    </div>
  );
}
