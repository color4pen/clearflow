import { auth } from "@/infrastructure/auth";
import { listClients } from "@/application/usecases";
import { clientRepository } from "@/infrastructure/repositories";
import { InquiryForm } from "./InquiryForm";
import type { Client } from "@/domain/models/client";
import type { ClientContact } from "@/domain/models/client";

export default async function InquiryNewPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const clients = await listClients(organizationId);

  // 全顧客の担当者を一括取得
  const contactsByClientId = new Map<string, ClientContact[]>();
  await Promise.all(
    clients.map(async (client: Client) => {
      const contacts = await clientRepository.findContactsByClientId(client.id);
      contactsByClientId.set(client.id, contacts);
    })
  );

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-text">引き合い登録</span>
      </div>
      <InquiryForm
        clients={clients}
        contactsByClientId={Object.fromEntries(contactsByClientId)}
      />
    </div>
  );
}
