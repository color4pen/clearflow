import Link from "next/link";
import type { Invoice } from "@/domain/models/invoice";
import { SECTION_CARD, TOOLBAR } from "../styles";

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function InvoiceTable({ invoices, showIssueDate }: { invoices: Invoice[]; showIssueDate?: boolean }) {
  if (invoices.length === 0) {
    return <p className="text-xs text-text-disabled py-4 text-center">該当する請求はありません</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border-light">
          <th className="text-left px-2 py-1 text-text-secondary font-normal">件名</th>
          <th className="text-right px-2 py-1 text-text-secondary font-normal w-28">金額</th>
          {showIssueDate ? (
            <th className="text-right px-2 py-1 text-text-secondary font-normal w-20">発行日</th>
          ) : (
            <th className="text-right px-2 py-1 text-text-secondary font-normal w-20">支払期日</th>
          )}
          <th className="text-left px-2 py-1 text-text-secondary font-normal w-24">契約</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv.id} className="border-b border-border-light last:border-0 hover:bg-bg-toolbar">
            <td className="px-2 py-1">{inv.title}</td>
            <td className="px-2 py-1 text-right">{formatAmount(inv.amount)}</td>
            {showIssueDate ? (
              <td className="px-2 py-1 text-right text-text-secondary">{formatDate(inv.issueDate)}</td>
            ) : (
              <td className="px-2 py-1 text-right text-text-secondary">{formatDate(inv.dueDate)}</td>
            )}
            <td className="px-2 py-1">
              <Link href={`/contracts/${inv.contractId}`} className="text-primary underline">
                詳細
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Props = {
  overdueInvoices: Invoice[];
  unpaidInvoices: Invoice[];
  monthlyRevenue: number;
  upcomingInvoices: Invoice[];
};

export function FinanceDashboard({ overdueInvoices, unpaidInvoices, monthlyRevenue, upcomingInvoices }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 今月の売上サマリ */}
      <section>
        <div className={`${TOOLBAR} mb-0`}>
          <span className="text-sm font-bold text-[#333333]">今月の売上</span>
        </div>
        <div className={`${SECTION_CARD} border-t-0 px-4 py-3`}>
          <span className="text-2xl font-bold text-text">{formatAmount(monthlyRevenue)}</span>
        </div>
      </section>

      {/* 期日超過の請求 */}
      <section>
        <div className={`${TOOLBAR} mb-0`}>
          <span className="text-sm font-bold text-[#333333]">期日超過</span>
          <span className="text-xs text-danger ml-2">{overdueInvoices.length} 件</span>
        </div>
        <div className={`${SECTION_CARD} border-t-0`}>
          <InvoiceTable invoices={overdueInvoices} />
        </div>
      </section>

      {/* 未入金の請求 */}
      <section>
        <div className={`${TOOLBAR} mb-0`}>
          <span className="text-sm font-bold text-[#333333]">未入金</span>
          <span className="text-xs text-text-secondary ml-2">{unpaidInvoices.length} 件</span>
        </div>
        <div className={`${SECTION_CARD} border-t-0`}>
          <InvoiceTable invoices={unpaidInvoices} />
        </div>
      </section>

      {/* 請求予定 */}
      <section>
        <div className={`${TOOLBAR} mb-0`}>
          <span className="text-sm font-bold text-[#333333]">請求予定</span>
          <span className="text-xs text-text-secondary ml-2">{upcomingInvoices.length} 件</span>
        </div>
        <div className={`${SECTION_CARD} border-t-0`}>
          <InvoiceTable invoices={upcomingInvoices} showIssueDate />
        </div>
      </section>
    </div>
  );
}
