import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getContract, listInvoicesByContract, hasPendingApproval } from "@/application/usecases";
import { SectionCard } from "@/app/components";
import { ContractStatusActions } from "./ContractStatusActions";
import { InvoiceSection } from "./InvoiceSection";
import { DeleteContractButton } from "./DeleteContractButton";
import { ContractInfoSection } from "./ContractInfoSection";
import { contractStatusLabels } from "@/app/(dashboard)/labels";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const contract = await getContract({ contractId: id, organizationId });
  if (!contract) {
    notFound();
  }

  const canManage =
    session!.user.role === "admin" || session!.user.role === "manager" || session!.user.role === "finance";
  const isTerminal = contract.status === "completed" || contract.status === "cancelled";

  const invoices = await listInvoicesByContract({ contractId: id, organizationId });
  let isPending = false;
  try {
    isPending = await hasPendingApproval(organizationId, id);
  } catch {
    // DB エラー時はバナー非表示で degradation
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{contract.title}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/contracts" className="text-primary underline">契約一覧</Link>
          {" > "}詳細
        </span>
      </div>

      {isPending && (
        <div className="bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-800 mb-2">
          この契約には承認待ちの申請があります
        </div>
      )}

      <div className="grid grid-cols-[3fr_2fr] gap-3">
        {/* 左カラム */}
        <div className="flex flex-col gap-3">
          <SectionCard className="p-3">
            <ContractInfoSection contract={contract} editable={canManage} />
            <dl className="text-xs space-y-1 mt-1">
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">ステータス</dt>
                <dd className="text-text px-2 py-1">{contractStatusLabels[contract.status] ?? contract.status}</dd>
              </div>
            </dl>

            {!isTerminal && (
              <div className="mt-3">
                <h2 className="text-xs font-bold text-text mb-2">ステータス変更</h2>
                <ContractStatusActions
                  contract={{ id: contract.id, status: contract.status }}
                  canChangeStatus={canManage}
                />
              </div>
            )}

            <div className="mt-3">
              <h2 className="text-xs font-bold text-text mb-2">関連情報</h2>
              <dl className="text-xs space-y-1">
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">関連案件</dt>
                  <dd className="text-text px-2 py-1">
                    <Link href={`/deals/${contract.dealId}`} className="text-primary underline text-xs">
                      案件を表示
                    </Link>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">顧客</dt>
                  <dd className="text-text px-2 py-1">
                    <Link href={`/clients/${contract.clientId}`} className="text-primary underline text-xs">
                      顧客を表示
                    </Link>
                  </dd>
                </div>
              </dl>
            </div>

            {canManage && invoices.length === 0 && (
              <div className="mt-3">
                <DeleteContractButton contractId={id} />
              </div>
            )}
          </SectionCard>
        </div>

        {/* 右カラム */}
        <div>
          <InvoiceSection
            contractId={contract.id}
            invoices={invoices}
            contractStatus={contract.status}
            canManage={canManage}
            contractAmount={contract.amount}
            renewalType={contract.renewalType}
          />
        </div>
      </div>
    </div>
  );
}
