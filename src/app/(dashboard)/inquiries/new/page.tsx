import { auth } from "@/infrastructure/auth";
import { listClients, listOrganizationUsers } from "@/application/usecases";
import { InquiryForm } from "./InquiryForm";

export default async function InquiryNewPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const [clients, allUsers] = await Promise.all([
    listClients(organizationId),
    listOrganizationUsers({ organizationId }),
  ]);
  const users = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-text">引き合い登録</span>
      </div>
      <InquiryForm clients={clients} users={users} />
    </div>
  );
}
