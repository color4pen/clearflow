import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { clientRepository } from "@/infrastructure/repositories";
import { EditClientForm } from "./EditClientForm";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const client = await clientRepository.findById(id, organizationId);
  if (!client) {
    notFound();
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">顧客編集</span>
      </div>
      <EditClientForm
        client={{
          id: client.id,
          name: client.name,
          industry: client.industry,
          size: client.size,
          address: client.address,
          notes: client.notes,
        }}
      />
    </div>
  );
}
