"use client";

import Link from "next/link";
import { PageToolbar, SectionCard } from "@/app/components";
import type { Invoice } from "@/domain/models/invoice";

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

function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="text-xs text-text-disabled py-2">請求がありません</p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-text-muted">
          <th className="py-1 pr-2">タイトル</th>
          <th className="py-1 pr-2 text-right w-32">金額</th>
          <th className="py-1 pr-2 text-right w-28">支払期日</th>
          <th className="py-1 text-right w-20">契約</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv.id} className="border-b hover:bg-bg-page">
            <td className="py-1 pr-2">{inv.title}</td>
            <td className="py-1 pr-2 text-right text-xs">
              ¥{inv.amount.toLocaleString("ja-JP")}
            </td>
            <td className="py-1 pr-2 text-right text-xs text-text-secondary">
              {formatDate(inv.dueDate)}
            </td>
            <td className="py-1 text-right text-xs">
              <Link
                href={`/contracts/${inv.contractId}`}
                className="text-primary underline"
              >
                詳細
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UpcomingInvoiceTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="text-xs text-text-disabled py-2">請求予定がありません</p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-text-muted">
          <th className="py-1 pr-2">タイトル</th>
          <th className="py-1 pr-2 text-right w-32">金額</th>
          <th className="py-1 pr-2 text-right w-28">発行予定日</th>
          <th className="py-1 text-right w-20">契約</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv.id} className="border-b hover:bg-bg-page">
            <td className="py-1 pr-2">{inv.title}</td>
            <td className="py-1 pr-2 text-right text-xs">
              ¥{inv.amount.toLocaleString("ja-JP")}
            </td>
            <td className="py-1 pr-2 text-right text-xs text-text-secondary">
              {formatDate(inv.issueDate)}
            </td>
            <td className="py-1 text-right text-xs">
              <Link
                href={`/contracts/${inv.contractId}`}
                className="text-primary underline"
              >
                詳細
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FinanceDashboard({
  overdueInvoices,
  unpaidInvoices,
  monthlySalesTotal,
  upcomingInvoices,
}: Props) {
  return (
    <div>
      <PageToolbar title="ダッシュボード（経理）" />

      <div className="mt-2 space-y-2">
        {/* Monthly sales summary */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            今月の売上サマリ
          </h2>
          <p className="text-3xl font-bold text-text">
            ¥{monthlySalesTotal.toLocaleString("ja-JP")}
          </p>
        </SectionCard>

        {/* Overdue invoices */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            期日超過の請求
            {overdueInvoices.length > 0 && (
              <span className="ml-2 text-danger text-xs font-normal">
                {overdueInvoices.length}件
              </span>
            )}
          </h2>
          <InvoiceTable invoices={overdueInvoices} />
        </SectionCard>

        {/* Unpaid invoices */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            未入金の請求
            {unpaidInvoices.length > 0 && (
              <span className="ml-2 text-warning text-xs font-normal">
                {unpaidInvoices.length}件
              </span>
            )}
          </h2>
          <InvoiceTable invoices={unpaidInvoices} />
        </SectionCard>

        {/* Upcoming invoices */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            請求予定（今月〜翌月）
          </h2>
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        </SectionCard>
      </div>
    </div>
  );
}
