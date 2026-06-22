import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listClients } from "@/application/usecases";
import { clientRepository, inquiryRepository, dealRepository } from "@/infrastructure/repositories";
import { PageToolbar, ToolbarActions, DataTable } from "@/app/components";

export default async function ClientsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const clients = await listClients(organizationId);

  // 担当者数を一括取得（GROUP BY で N+1 回避）
  const contactCountMap = await clientRepository.countContactsByClientIds(
    clients.map((c) => c.id)
  );

  // 引き合い数・案件数を一括取得して JS で集計（N+1 回避）
  const [allInquiries, allDeals] = await Promise.all([
    inquiryRepository.findAllByOrganization(organizationId),
    dealRepository.findAllByOrganization(organizationId),
  ]);

  const inquiryCountMap = new Map<string, number>();
  for (const inq of allInquiries) {
    if (inq.clientId) {
      inquiryCountMap.set(inq.clientId, (inquiryCountMap.get(inq.clientId) ?? 0) + 1);
    }
  }

  const dealCountMap = new Map<string, number>();
  for (const deal of allDeals) {
    dealCountMap.set(deal.clientId, (dealCountMap.get(deal.clientId) ?? 0) + 1);
  }

  return (
    <div>
      <PageToolbar
        title="顧客管理"
        actions={
          <ToolbarActions>
            <Link href="/clients/new" className="text-xs text-primary underline">
              [新規登録]
            </Link>
          </ToolbarActions>
        }
      />

      {clients.length === 0 ? (
        <div className="text-center py-8 text-text-disabled text-sm bg-bg-surface border border-border border-t-0">
          <p>顧客が登録されていません</p>
          <Link
            href="/clients/new"
            className="mt-2 inline-block text-primary underline text-xs"
          >
            最初の顧客を登録する
          </Link>
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "企業名",
              render: (row) => (
                <Link href={`/clients/${row.id}`} className="text-primary underline">
                  {row.name}
                </Link>
              ),
            },
            {
              key: "industry",
              header: "業種",
              render: (row) => row.industry ?? "-",
            },
            {
              key: "size",
              header: "規模",
              render: (row) => row.size ?? "-",
            },
            {
              key: "contacts",
              header: "担当者数",
              align: "right" as const,
              render: (row) => `${contactCountMap.get(row.id) ?? 0} 名`,
            },
            {
              key: "inquiries",
              header: "引き合い数",
              align: "right" as const,
              render: (row) => `${inquiryCountMap.get(row.id) ?? 0} 件`,
            },
            {
              key: "deals",
              header: "案件数",
              align: "right" as const,
              render: (row) => `${dealCountMap.get(row.id) ?? 0} 件`,
            },
            {
              key: "createdAt",
              header: "登録日",
              render: (row) => row.createdAt.toLocaleDateString("ja-JP"),
            },
          ]}
          rows={clients}
          rowKey={(row) => row.id}
          rowHref={(row) => `/clients/${row.id}`}
          footer={`${clients.length} 件`}
        />
      )}
    </div>
  );
}
