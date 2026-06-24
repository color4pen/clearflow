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
          <Link href={`/contracts/${contractId}`} className="text-primary underline">契約詳細</Link>
          {" > "}請求詳細
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">請求情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">タイトル</dt>
              <dd className="text-text px-2 py-1">{invoice.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">金額</dt>
              <dd className="text-text px-2 py-1">¥{invoice.amount.toLocaleString("ja-JP")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">請求日</dt>
              <dd className="text-text px-2 py-1">{formatDate(invoice.issueDate)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">支払期日</dt>
              <dd className="text-text px-2 py-1">{formatDate(invoice.dueDate)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">入金日</dt>
              <dd className="text-text px-2 py-1">{formatDate(invoice.paidAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">ステータス</dt>
              <dd className="text-text px-2 py-1">
                <span className={
                  invoice.status === "invoiced" ? "text-primary" :
                  invoice.status === "paid" ? "text-success" :
                  invoice.status === "overdue" ? "text-danger" : ""
                }>
                  {invoiceStatusLabels[invoice.status] ?? invoice.status}
                </span>
              </dd>
            </div>
            {invoice.notes && (
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">備考</dt>
                <dd className="text-text px-2 py-1 whitespace-pre-wrap">{invoice.notes}</dd>
              </div>
            )}
          </dl>
        </SectionCard>

        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">関連情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">紐づく契約</dt>
              <dd className="text-text px-2 py-1">
                <Link href={`/contracts/${contractId}`} className="text-primary underline text-xs">
                  {contract.title}
                </Link>
              </dd>
            </div>
          </dl>

          {canChangeStatus && (
            <div className="mt-4">
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
