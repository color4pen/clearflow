import { notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { inquiryRepository, clientRepository } from "@/infrastructure/repositories";
import { listClients } from "@/application/usecases";
import { EditInquiryForm } from "./EditInquiryForm";

export default async function EditInquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const inquiry = await inquiryRepository.findById(id, organizationId);
  if (!inquiry) {
    notFound();
  }

  const clients = await listClients(organizationId);

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">引き合い編集</span>
      </div>
      <EditInquiryForm
        inquiry={{
          id: inquiry.id,
          title: inquiry.title,
          description: inquiry.description,
          source: inquiry.source,
          clientId: inquiry.clientId,
        }}
        clients={clients}
      />
    </div>
  );
}
