import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getRevenueDetails } from "@/application/usecases";
import { PageToolbar, SectionCard, DataTable } from "@/app/components";
import { aggregationAxisLabels } from "@/app/(dashboard)/labels";
import type { RevenueAxis } from "@/application/usecases/getRevenueDetails";
import type { MonthlyRevenue, CustomerRevenue, DealRevenue } from "@/domain/models/revenue";

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function isValidAxis(value: string | null): value is RevenueAxis {
  return value === "monthly" || value === "customer" || value === "deal";
}

export default async function RevenueDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; axis?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const params = await searchParams;
  const defaults = getDefaultDates();
  const startDateStr = params.startDate ?? defaults.startDate;
  const endDateStr = params.endDate ?? defaults.endDate;
  const axis: RevenueAxis = isValidAxis(params.axis ?? null) ? (params.axis as RevenueAxis) : "monthly";

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr + "T23:59:59.999Z");

  const result = await getRevenueDetails({
    organizationId,
    startDate,
    endDate,
    axis,
  });

  const exportUrl = `/api/revenue/export?startDate=${startDateStr}&endDate=${endDateStr}&axis=${axis}`;

  return (
    <div>
      <PageToolbar title="売上明細" />

      <SectionCard className="p-4 mt-2">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">開始日</label>
            <input
              type="date"
              name="startDate"
              defaultValue={startDateStr}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">終了日</label>
            <input
              type="date"
              name="endDate"
              defaultValue={endDateStr}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">集計軸</label>
            <select
              name="axis"
              defaultValue={axis}
              className="border rounded px-2 py-1 text-sm"
            >
              {(Object.entries(aggregationAxisLabels) as [RevenueAxis, string][]).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-primary text-white rounded text-sm hover:opacity-90"
          >
            絞り込み
          </button>
          <Link
            href={exportUrl}
            className="px-3 py-1 border border-primary text-primary rounded text-sm hover:opacity-90"
          >
            CSVエクスポート
          </Link>
        </form>
      </SectionCard>

      <SectionCard className="p-2 mt-2">
        {result.axis === "monthly" && (
          <DataTable<MonthlyRevenue>
            columns={[
              { key: "yearMonth", header: "期間", render: (row) => row.yearMonth },
              {
                key: "amount",
                header: "金額",
                align: "right",
                render: (row) => `¥${row.amount.toLocaleString("ja-JP")}`,
              },
              { key: "count", header: "件数", align: "right", render: (row) => String(row.count) },
            ]}
            rows={result.data}
            rowKey={(row) => row.yearMonth}
          />
        )}
        {result.axis === "customer" && (
          <DataTable<CustomerRevenue>
            columns={[
              { key: "clientName", header: "顧客名", render: (row) => row.clientName },
              {
                key: "amount",
                header: "金額",
                align: "right",
                render: (row) => `¥${row.amount.toLocaleString("ja-JP")}`,
              },
              { key: "count", header: "件数", align: "right", render: (row) => String(row.count) },
            ]}
            rows={result.data}
            rowKey={(row) => row.clientId}
          />
        )}
        {result.axis === "deal" && (
          <DataTable<DealRevenue>
            columns={[
              { key: "dealTitle", header: "案件名", render: (row) => row.dealTitle },
              {
                key: "amount",
                header: "金額",
                align: "right",
                render: (row) => `¥${row.amount.toLocaleString("ja-JP")}`,
              },
              { key: "count", header: "件数", align: "right", render: (row) => String(row.count) },
            ]}
            rows={result.data}
            rowKey={(row) => row.dealId}
          />
        )}
        {result.data.length === 0 && (
          <p className="text-xs text-text-muted py-4 text-center">データなし</p>
        )}
      </SectionCard>
    </div>
  );
}
