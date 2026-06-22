import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { contractRepository, invoiceRepository } from "@/infrastructure/repositories";
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

  const contract = await contractRepository.findById(id, organizationId);
  if (!contract) {
    notFound();
  }

  const canManage =
    session!.user.role === "admin" || session!.user.role === "manager";
  const isTerminal = contract.status === "completed" || contract.status === "cancelled";

  const invoices = await invoiceRepository.findAllByContract(id, organizationId);

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{contract.title}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/contracts" className="text-primary underline">契約一覧</Link>
          {" > "}詳細
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SectionCard className="p-3">
          <ContractInfoSection contract={contract} editable={canManage} />
          <dl className="text-xs space-y-1 mt-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">ステータス</dt>
              <dd className="text-text">{contractStatusLabels[contract.status] ?? contract.status}</dd>
            </div>
          </dl>
          {canManage && invoices.length === 0 && (
            <div className="mt-2">
              <DeleteContractButton contractId={id} />
            </div>
          )}
        </SectionCard>

        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">関連情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">関連案件</dt>
              <dd className="text-text">
                <Link href={`/deals/${contract.dealId}`} className="text-primary underline">
                  案件を表示
                </Link>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">顧客</dt>
              <dd className="text-text">
                <Link href={`/clients/${contract.clientId}`} className="text-primary underline">
                  顧客を表示
                </Link>
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      {!isTerminal && (
        <SectionCard className="p-3 mb-2">
          <h2 className="text-xs font-bold text-text mb-2">ステータス変更</h2>
          <ContractStatusActions
            contract={{ id: contract.id, status: contract.status }}
            canChangeStatus={canManage}
          />
        </SectionCard>
      )}

      <div className="mb-2">
        <InvoiceSection
          contractId={contract.id}
          organizationId={organizationId}
          contractStatus={contract.status}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
