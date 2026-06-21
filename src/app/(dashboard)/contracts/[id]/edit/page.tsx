import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { contractRepository } from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { ContractEditForm } from "../ContractEditForm";

export default async function ContractEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (session!.user.role !== "admin" && session!.user.role !== "manager") {
    redirect("/contracts");
  }

  const organizationId = session!.user.organizationId;
  const contract = await contractRepository.findById(id, organizationId);
  if (!contract) {
    notFound();
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">契約編集</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/contracts" className="text-primary underline">契約一覧</Link>
          {" > "}
          <Link href={`/contracts/${id}`} className="text-primary underline">{contract.title}</Link>
          {" > "}編集
        </span>
      </div>

      <SectionCard className="p-3">
        <ContractEditForm contract={contract} />
      </SectionCard>
    </div>
  );
}
