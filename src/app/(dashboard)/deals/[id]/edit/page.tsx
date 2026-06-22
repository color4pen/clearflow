import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { dealRepository } from "@/infrastructure/repositories";
import { listOrganizationUsers } from "@/application/usecases";
import { DealEditForm } from "../DealEditForm";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const deal = await dealRepository.findById(id, organizationId);
  if (!deal) {
    notFound();
  }

  const allUsers = await listOrganizationUsers({ organizationId });
  const users = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">案件編集</span>
      </div>
      <DealEditForm deal={deal} users={users} />
    </div>
  );
}
