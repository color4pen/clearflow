import Link from "next/link";
import { invoiceRepository } from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { DataTable } from "@/app/components/DataTable";
import { invoiceStatusLabels } from "@/app/(dashboard)/labels";
import type { Invoice } from "@/domain/models/invoice";
import type { RenewalType } from "@/domain/models/contract";

type Props = {
  contractId: string;
  organizationId: string;
  contractStatus: string;
  canManage: boolean;
  contractAmount: number;
  renewalType: RenewalType;
};

function computeSummary(invoices: Invoice[]) {
  let invoicedTotal = 0;
  let paidTotal = 0;
  let scheduledTotal = 0;

  for (const inv of invoices) {
    if (inv.status === "invoiced" || inv.status === "overdue") {
      invoicedTotal += inv.amount;
    } else if (inv.status === "paid") {
      paidTotal += inv.amount;
    } else if (inv.status === "scheduled") {
      scheduledTotal += inv.amount;
    }
  }

  return { invoicedTotal, paidTotal, scheduledTotal };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type ProgressBarSummaryProps = {
  contractAmount: number;
  paidTotal: number;
  invoicedTotal: number;
  scheduledTotal: number;
};

function ProgressBarSummary({ contractAmount, paidTotal, invoicedTotal, scheduledTotal }: ProgressBarSummaryProps) {
  const base = contractAmount > 0 ? contractAmount : 1;
  const paidPct = clamp((paidTotal / base) * 100, 0, 100);
  const invoicedPct = clamp((invoicedTotal / base) * 100, 0, 100 - paidPct);
  const remaining = Math.max(contractAmount - paidTotal - invoicedTotal - scheduledTotal, 0);

  return (
    <div className="mb-3">
      <div className="flex h-3 w-full overflow-hidden bg-gray-200 mb-1">
        <div
          className="bg-green-500 h-full"
          style={{ width: `${paidPct}%` }}
        />
        <div
          className="bg-blue-500 h-full"
          style={{ width: `${invoicedPct}%` }}
        />
      </div>
      <div className="flex gap-3 text-xs text-text-muted">
        <span>
          <span className="inline-block w-2 h-2 bg-green-500 mr-1" />
          入金済 ¥{paidTotal.toLocaleString("ja-JP")}
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-blue-500 mr-1" />
          請求済 ¥{invoicedTotal.toLocaleString("ja-JP")}
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-gray-200 border border-gray-300 mr-1" />
          残り ¥{remaining.toLocaleString("ja-JP")}
        </span>
      </div>
    </div>
  );
}

export async function InvoiceSection({ contractId, organizationId, contractStatus, canManage, contractAmount, renewalType }: Props) {
  const invoices = await invoiceRepository.findAllByContract(contractId, organizationId);
  const { invoicedTotal, paidTotal, scheduledTotal } = computeSummary(invoices);

  const isActiveContract = contractStatus === "active";
  const isOneTime = renewalType === "one_time";

  const columns = [
    {
      key: "title",
      header: "請求名",
      render: (row: Invoice) => (
        <Link
          href={`/contracts/${contractId}/invoices/${row.id}`}
          className="text-primary underline text-xs"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: "amount",
      header: "金額",
      align: "right" as const,
      render: (row: Invoice) => <span>¥{row.amount.toLocaleString("ja-JP")}</span>,
    },
    {
      key: "dueDate",
      header: "支払期日",
      render: (row: Invoice) =>
        row.dueDate ? row.dueDate.toLocaleDateString("ja-JP") : "-",
    },
    {
      key: "status",
      header: "ステータス",
      render: (row: Invoice) => {
        const colorClass =
          row.status === "invoiced"
            ? "text-primary"
            : row.status === "paid"
              ? "text-success"
              : row.status === "overdue"
                ? "text-danger"
                : "";
        return (
          <span className={colorClass}>
            {invoiceStatusLabels[row.status] ?? row.status}
          </span>
        );
      },
    },
  ];

  return (
    <SectionCard className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">請求一覧</h2>
        {canManage && isActiveContract && (
          <Link
            href={`/contracts/${contractId}/invoices/new`}
            className="text-xs px-3 py-1 bg-primary text-white"
          >
            請求を追加
          </Link>
        )}
      </div>

      {/* 請求サマリー */}
      {isOneTime ? (
        <ProgressBarSummary
          contractAmount={contractAmount}
          paidTotal={paidTotal}
          invoicedTotal={invoicedTotal}
          scheduledTotal={scheduledTotal}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-bg-toolbar border border-border p-2 text-center">
            <p className="text-xs text-text-muted">請求済合計</p>
            <p className="text-sm font-bold text-text">
              ¥{invoicedTotal.toLocaleString("ja-JP")}
            </p>
          </div>
          <div className="bg-bg-toolbar border border-border p-2 text-center">
            <p className="text-xs text-text-muted">入金済合計</p>
            <p className="text-sm font-bold text-text">
              ¥{paidTotal.toLocaleString("ja-JP")}
            </p>
          </div>
          <div className="bg-bg-toolbar border border-border p-2 text-center">
            <p className="text-xs text-text-muted">未請求合計</p>
            <p className="text-sm font-bold text-text">
              ¥{scheduledTotal.toLocaleString("ja-JP")}
            </p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <p className="text-xs text-text-muted">請求はまだありません</p>
      ) : (
        <DataTable
          columns={columns}
          rows={invoices}
          rowKey={(row) => row.id}
        />
      )}
    </SectionCard>
  );
}
