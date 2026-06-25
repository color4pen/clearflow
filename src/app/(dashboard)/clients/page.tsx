import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listClients } from "@/application/usecases";
import { dealRepository } from "@/infrastructure/repositories";
import { PageToolbar, ToolbarActions, DataTable } from "@/app/components";

export default async function ClientsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const clients = await listClients(organizationId);

  // 案件数を一括取得して JS で集計（N+1 回避）
  const allDeals = await dealRepository.findAllByOrganization(organizationId);

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
              key: "deals",
              header: "関連案件数",
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
