import { auth } from "@/infrastructure/auth";
import { listClients } from "@/application/usecases";
import { clientRepository } from "@/infrastructure/repositories";
import { InquiryForm } from "./InquiryForm";
import type { ClientContact } from "@/domain/models/client";

export default async function InquiryNewPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const clients = await listClients(organizationId);

  // 組織配下の全担当者を1クエリで取得してクライアント側でグループ化（N+1 回避）
  const allContacts = await clientRepository.findAllContactsByOrganization(organizationId);
  const contactsByClientId = new Map<string, ClientContact[]>();
  for (const contact of allContacts) {
    const list = contactsByClientId.get(contact.clientId) ?? [];
    list.push(contact);
    contactsByClientId.set(contact.clientId, list);
  }

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
