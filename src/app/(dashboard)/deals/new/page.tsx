import { auth } from "@/infrastructure/auth";
import { clientRepository } from "@/infrastructure/repositories";
import { listOrganizationUsers } from "@/application/usecases";
import { NewDealForm } from "./NewDealForm";
import { PageToolbar } from "@/app/components";
import type { Client } from "@/domain/models/client";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ inquiryId?: string }>;
}) {
  const { inquiryId } = await searchParams;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  // 引き合いなし（直接作成）の場合のみ顧客一覧を取得する
  let clients: Client[] = [];
  if (!inquiryId) {
    clients = await clientRepository.findAllByOrganization(organizationId);
  }

  const allUsers = await listOrganizationUsers({ organizationId });
  const users = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div>
      <PageToolbar title="案件を作成" />
      <div className="mt-2">
        <NewDealForm inquiryId={inquiryId ?? null} clients={clients} users={users} />
      </div>
    </div>
  );
}
