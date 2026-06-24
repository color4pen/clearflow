"use client";

import Link from "next/link";
import { SectionCard } from "@/app/components";
import type { Invoice } from "@/domain/models/invoice";
import { DashboardHeader } from "./DashboardHeader";

type Props = {
  overdueInvoices: Invoice[];
  unpaidInvoices: Invoice[];
  monthlySalesTotal: number;
  upcomingInvoices: Invoice[];
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function FinanceDashboard({
  overdueInvoices,
  unpaidInvoices,
  monthlySalesTotal,
  upcomingInvoices,
}: Props) {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div>
      <DashboardHeader
        title="ダッシュボード（経理）"
        subtitle={today}
        actions={
          <Link
            href="/contracts"
            className="border border-border text-text text-sm px-3 py-1.5 rounded hover:bg-bg-page"
          >
            契約を見る
          </Link>
        }
      />

      <div className="mt-2 space-y-2">
        {/* KPI card grid */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3">
          <SectionCard className="p-4">
            <p className="text-xs text-text-muted mb-1">今月の売上</p>
            <p className="text-xl font-bold text-success font-mono">
              ¥{monthlySalesTotal.toLocaleString("ja-JP")}
            </p>
          </SectionCard>
          <SectionCard className="p-4">
            <p className="text-xs text-text-muted mb-1">期日超過</p>
            <p className="text-xl font-bold text-danger font-mono">
              {overdueInvoices.length}件
            </p>
          </SectionCard>
          <SectionCard className="p-4">
            <p className="text-xs text-text-muted mb-1">未入金</p>
            <p className="text-xl font-bold text-text font-mono">
              {unpaidInvoices.length}件
            </p>
          </SectionCard>
          <SectionCard className="p-4">
            <p className="text-xs text-text-muted mb-1">請求予定</p>
            <p className="text-xl font-bold text-text font-mono">
              {upcomingInvoices.length}件
            </p>
          </SectionCard>
        </div>

        {/* Overdue invoices grid */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            期日超過の請求
            {overdueInvoices.length > 0 && (
              <span className="ml-2 text-danger text-xs font-normal">
                {overdueInvoices.length}件
              </span>
            )}
          </h2>
          {overdueInvoices.length === 0 ? (
            <p className="text-xs text-text-disabled py-2">
              期日超過の請求はありません
            </p>
          ) : (
            <div>
              {/* Header row */}
              <div className="grid grid-cols-[1fr_80px_100px_100px_80px] text-table-head text-text-muted bg-bg-table-head py-1.5 px-2 text-xs">
                <div>請求タイトル</div>
                <div>契約</div>
                <div className="text-right">金額</div>
                <div className="text-right">支払期日</div>
                <div className="text-right">超過日数</div>
              </div>
              {/* Data rows */}
              {overdueInvoices.map((inv) => {
                const overdueDays = Math.floor(
                  (Date.now() - inv.dueDate.getTime()) / 86400000
                );
                return (
                  <div
                    key={inv.id}
                    className="grid grid-cols-[1fr_80px_100px_100px_80px] border-b border-border-light py-1.5 px-2"
                  >
                    <div className="text-xs">{inv.title}</div>
                    <div className="text-xs">
                      <Link
                        href={`/contracts/${inv.contractId}`}
                        className="text-primary underline"
                      >
                        {inv.contractId.slice(0, 8)}
                      </Link>
                    </div>
                    <div className="text-xs font-mono text-right">
                      ¥{inv.amount.toLocaleString("ja-JP")}
                    </div>
                    <div className="text-xs font-mono text-right">
                      {formatDate(inv.dueDate)}
                    </div>
                    <div className="text-xs text-danger font-bold text-right">
                      {overdueDays}日超過
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Bottom 2-column: unpaid + upcoming */}
        <div className="grid grid-cols-2 gap-4">
          {/* Unpaid invoices */}
          <SectionCard className="p-4">
            <h2 className="text-sm font-semibold text-text-muted mb-2">
              未入金の請求
              {unpaidInvoices.length > 0 && (
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  {unpaidInvoices.length}件
                </span>
              )}
            </h2>
            {unpaidInvoices.length === 0 ? (
              <p className="text-xs text-text-disabled py-2">請求がありません</p>
            ) : (
              <div>
                {unpaidInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 border-b border-border-light py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{inv.title}</p>
                      <Link
                        href={`/contracts/${inv.contractId}`}
                        className="text-2xs text-text-muted underline"
                      >
                        {inv.contractId.slice(0, 8)}
                      </Link>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-mono text-text-secondary">
                        {formatDate(inv.dueDate)}
                      </p>
                      <p className="text-xs font-mono font-bold">
                        ¥{inv.amount.toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Upcoming invoices */}
          <SectionCard className="p-4">
            <h2 className="text-sm font-semibold text-text-muted mb-2">
              請求予定（今月〜翌月）
              {upcomingInvoices.length > 0 && (
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  {upcomingInvoices.length}件
                </span>
              )}
            </h2>
            {upcomingInvoices.length === 0 ? (
              <p className="text-xs text-text-disabled py-2">請求予定がありません</p>
            ) : (
              <div>
                {upcomingInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 border-b border-border-light py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{inv.title}</p>
                      <Link
                        href={`/contracts/${inv.contractId}`}
                        className="text-2xs text-text-muted underline"
                      >
                        {inv.contractId.slice(0, 8)}
                      </Link>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-mono text-text-secondary">
                        {formatDate(inv.issueDate)}
                      </p>
                      <p className="text-xs font-mono font-bold">
                        ¥{inv.amount.toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
