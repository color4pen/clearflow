import { invoiceRepository } from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { DataTable } from "@/app/components/DataTable";
import { invoiceStatusLabels } from "@/app/(dashboard)/labels";
import { InvoiceStatusButtons } from "./InvoiceStatusButtons";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import type { Invoice } from "@/domain/models/invoice";

type Props = {
  contractId: string;
  organizationId: string;
  contractStatus: string;
  canManage: boolean;
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

export async function InvoiceSection({ contractId, organizationId, contractStatus, canManage }: Props) {
  const invoices = await invoiceRepository.findAllByContract(contractId, organizationId);
  const { invoicedTotal, paidTotal, scheduledTotal } = computeSummary(invoices);

  const isActiveContract = contractStatus === "active";

  const columns = [
    {
      key: "title",
      header: "請求名",
      render: (row: Invoice) => <span className="text-text">{row.title}</span>,
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
      render: (row: Invoice) =>
        invoiceStatusLabels[row.status] ?? row.status,
    },
    {
      key: "actions",
      header: "",
      render: (row: Invoice) =>
        canManage ? (
          <InvoiceStatusButtons invoiceId={row.id} status={row.status} />
        ) : null,
    },
  ];

  return (
    <SectionCard className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">請求一覧</h2>
        {canManage && isActiveContract && (
          <CreateInvoiceModal contractId={contractId} />
        )}
      </div>

      {/* 請求サマリー */}
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
