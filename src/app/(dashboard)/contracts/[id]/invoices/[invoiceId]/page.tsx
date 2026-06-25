import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getInvoice } from "@/application/usecases";
import { canPerform } from "@/domain/authorization";
import { SectionCard } from "@/app/components";
import { invoiceStatusLabels } from "@/app/(dashboard)/labels";
import { InvoiceActions } from "./InvoiceActions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id: contractId, invoiceId } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const result = await getInvoice({ invoiceId, organizationId });
  if (!result) {
    notFound();
  }

  const { invoice, contract } = result;

  if (invoice.contractId !== contractId) {
    notFound();
  }

  const canChangeStatus = canPerform(session!.user.role, "invoice", "changeStatus");

  const formatDate = (date: Date | null) =>
    date ? date.toLocaleDateString("ja-JP") : "-";

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{invoice.title}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/contracts" className="text-primary underline">契約一覧</Link>
          {" > "}
          <Link href={`/contracts/${contractId}`} className="text-primary underline">{contract.title}</Link>
          {" > "}請求詳細
        </span>
      </div>

      <div className="max-w-[560px] mx-auto">
        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">請求情報</h2>
          <dl className="grid grid-cols-[90px_1fr] gap-y-1 text-xs">
            <dt className="text-text-muted">タイトル</dt>
            <dd className="text-text">{invoice.title}</dd>

            <dt className="text-text-muted">金額</dt>
            <dd className="text-text">¥{invoice.amount.toLocaleString("ja-JP")}</dd>

            <dt className="text-text-muted">請求日</dt>
            <dd className="text-text">{formatDate(invoice.issueDate)}</dd>

            <dt className="text-text-muted">支払期日</dt>
            <dd className="text-text">{formatDate(invoice.dueDate)}</dd>

            <dt className="text-text-muted">入金日</dt>
            <dd className="text-text">{formatDate(invoice.paidAt)}</dd>

            <dt className="text-text-muted">ステータス</dt>
            <dd className="text-text">
              <span className={
                invoice.status === "invoiced" ? "text-primary" :
                invoice.status === "paid" ? "text-success" :
                invoice.status === "overdue" ? "text-danger" : ""
              }>
                {invoiceStatusLabels[invoice.status] ?? invoice.status}
              </span>
            </dd>

            {invoice.notes && (
              <>
                <dt className="text-text-muted">備考</dt>
                <dd className="text-text whitespace-pre-wrap">{invoice.notes}</dd>
              </>
            )}
          </dl>

          <div className="mt-3">
            <h3 className="text-xs font-bold text-text mb-1">関連情報</h3>
            <dl className="grid grid-cols-[90px_1fr] gap-y-1 text-xs">
              <dt className="text-text-muted">紐づく契約</dt>
              <dd className="text-text">
                <Link href={`/contracts/${contractId}`} className="text-primary underline text-xs">
                  {contract.title}
                </Link>
              </dd>
            </dl>
          </div>

          {canChangeStatus && (
            <div className="mt-3">
              <h3 className="text-xs font-bold text-text mb-2">ステータス操作</h3>
              <InvoiceActions
                invoiceId={invoiceId}
                contractId={contractId}
                status={invoice.status}
              />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
