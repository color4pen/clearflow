import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getDeal } from "@/application/usecases";
import { NewContractForm } from "./NewContractForm";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>;
}) {
  const { dealId } = await searchParams;
  if (!dealId) {
    notFound();
  }

  const session = await auth();
  const organizationId = session!.user.organizationId;

  const deal = await getDeal(dealId, organizationId);
  if (!deal) {
    notFound();
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">契約作成</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href={`/deals/${dealId}`} className="text-primary underline">{deal.title}</Link>
          {" > "}新規契約
        </span>
      </div>
      <NewContractForm
        deal={{
          id: deal.id,
          title: deal.title,
          contractType: deal.contractType,
          estimatedAmount: deal.estimatedAmount,
          estimatedStartDate: deal.estimatedStartDate
            ? deal.estimatedStartDate.toISOString().slice(0, 10)
            : null,
          estimatedEndDate: deal.estimatedEndDate
            ? deal.estimatedEndDate.toISOString().slice(0, 10)
            : null,
        }}
      />
    </div>
  );
}
