import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getContract, listInvoicesByContract, hasPendingApproval, listInteractionsByContract } from "@/application/usecases";
import { canPerform } from "@/domain/authorization";
import { SectionCard } from "@/app/components";
import { ContractStatusActions } from "./ContractStatusActions";
import { InvoiceSection } from "./InvoiceSection";
import { DeleteContractButton } from "./DeleteContractButton";
import { ContractInfoSection } from "./ContractInfoSection";
import { ContractInteractionSection } from "./ContractInteractionSection";
import { contractStatusLabels } from "@/app/(dashboard)/labels";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";

const CONTRACT_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  active: "green",
  completed: "navy",
  cancelled: "red",
};

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

  const [invoices, contractInteractions] = await Promise.all([
    listInvoicesByContract({ contractId: id, organizationId }),
    listInteractionsByContract(id, organizationId),
  ]);
  let isPending = false;
  try {
    isPending = await hasPendingApproval(organizationId, id);
  } catch {
    // DB エラー時はバナー非表示で degradation
  }

  const canRecord = canPerform(session!.user.role, "interaction", "recordContractInteraction");

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-xs text-text-muted mb-0.5">
        <Link href="/contracts" className="text-primary underline">契約一覧</Link>
        {" > "}
        {contract.title}
      </div>

      {/* Hero row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h1 className="text-lg font-bold text-text">{contract.title}</h1>
        <StatusBadge variant={CONTRACT_STATUS_VARIANT[contract.status] ?? "gray"}>
          {contractStatusLabels[contract.status] ?? contract.status}
        </StatusBadge>
        <div className="ml-auto flex items-center gap-3">
          <Link href={`/deals/${contract.dealId}`} className="text-primary underline text-xs">
            案件を表示
          </Link>
          <Link href={`/clients/${contract.clientId}`} className="text-primary underline text-xs">
            顧客を表示
          </Link>
        </div>
      </div>

      {isPending && (
        <div className="bg-bg-row-pending border border-border-row-pending px-3 py-2 text-xs text-warning mb-2">
          この契約には承認待ちの申請があります
        </div>
      )}

      <div className="grid grid-cols-[3fr_2fr] gap-3">
        {/* 左カラム */}
        <div className="flex flex-col gap-3">
          <SectionCard className="p-3">
            <ContractInfoSection contract={contract} editable={canManage} />

            {!isTerminal && (
              <div className="mt-3">
                <h2 className="text-xs font-bold text-text mb-2">ステータス変更</h2>
                <ContractStatusActions
                  contract={{ id: contract.id, status: contract.status }}
                  canChangeStatus={canManage}
                />
              </div>
            )}

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
          <ContractInteractionSection
            contractId={contract.id}
            interactions={contractInteractions}
            canRecord={canRecord}
          />
        </div>
      </div>
    </div>
  );
}
