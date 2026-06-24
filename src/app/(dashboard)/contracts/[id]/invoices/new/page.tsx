import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { contractRepository, invoiceRepository } from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { NewInvoiceForm } from "./NewInvoiceForm";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contractId } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const contract = await contractRepository.findById(contractId, organizationId);
  if (!contract) {
    notFound();
  }

  const isActive = contract.status === "active";

  let remainingAmount: number | null = null;
  if (isActive && contract.renewalType === "one_time" && contract.amount > 0) {
    const existingTotal = await invoiceRepository.sumAmountByContract(contractId, organizationId);
    remainingAmount = contract.amount - existingTotal;
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">請求登録</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/contracts" className="text-primary underline">契約一覧</Link>
          {" > "}
          <Link href={`/contracts/${contractId}`} className="text-primary underline">契約詳細</Link>
          {" > "}請求登録
        </span>
      </div>

      {!isActive ? (
        <SectionCard className="p-3">
          <p className="text-xs text-text-muted">
            この契約は有効ではないため、請求を作成できません。
          </p>
        </SectionCard>
      ) : (
        <NewInvoiceForm contractId={contractId} remainingAmount={remainingAmount} />
      )}
    </div>
  );
}
