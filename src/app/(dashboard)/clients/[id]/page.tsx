import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getClient, listClientContacts, listInquiriesByClient, listDealsByClient, listContractsByClient } from "@/application/usecases";
import { SectionCard, DataTable } from "@/app/components";
import { statusLabels, sourceLabels, phaseLabels, contractTypeLabels, contractStatusLabels } from "@/app/(dashboard)/labels";
import { ClientInfoSection } from "./ClientInfoSection";
import { ClientContactsSection } from "./ClientContactsSection";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const editable =
    session!.user.role === "admin" || session!.user.role === "manager";

  const [client, contacts, relatedInquiries, relatedDeals, relatedContracts] =
    await Promise.all([
      getClient(id, organizationId),
      listClientContacts(id),
      listInquiriesByClient(id, organizationId),
      listDealsByClient(id, organizationId),
      listContractsByClient(id, organizationId),
    ]);

  if (!client) {
    notFound();
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{client.name}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/clients" className="text-primary underline">顧客一覧</Link>
          {" > "}詳細
        </span>
      </div>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: "1.5fr 1fr" }}
      >
        {/* 左カラム: 企業情報 + 担当者 */}
        <div className="space-y-6">
          <SectionCard className="p-3">
            <ClientInfoSection
              client={{
                id: client.id,
                name: client.name,
                industry: client.industry,
                size: client.size,
                address: client.address,
                notes: client.notes,
                createdAt: client.createdAt,
              }}
              editable={editable}
            />
          </SectionCard>

          <SectionCard>
            <ClientContactsSection
              clientId={client.id}
              contacts={contacts}
              editable={editable}
            />
          </SectionCard>
        </div>

        {/* 右カラム: 関連引合 + 案件一覧 + 契約一覧 */}
        <div className="space-y-6">
          <SectionCard>
            <h2 className="text-xs font-bold text-text px-2 py-1 border-b border-border-light">関連引き合い</h2>
            {relatedInquiries.length === 0 ? (
              <p className="text-xs text-text-muted px-2 py-3">関連する引き合いはありません</p>
            ) : (
              <DataTable
                columns={[
                  {
                    key: "title",
                    header: "件名",
                    render: (row) => (
                      <Link href={`/inquiries/${row.id}`} className="text-primary underline">
                        {row.title}
                      </Link>
                    ),
                  },
                  {
                    key: "status",
                    header: "ステータス",
                    render: (row) => statusLabels[row.status] ?? row.status,
                  },
                  {
                    key: "source",
                    header: "流入経路",
                    render: (row) => sourceLabels[row.source] ?? row.source,
                  },
                  {
                    key: "createdAt",
                    header: "作成日",
                    render: (row) => row.createdAt.toLocaleDateString("ja-JP"),
                  },
                ]}
                rows={relatedInquiries}
                rowKey={(row) => row.id}
                rowHref={(row) => `/inquiries/${row.id}`}
              />
            )}
          </SectionCard>

          <SectionCard>
            <h2 className="text-xs font-bold text-text px-2 py-1 border-b border-border-light">案件一覧</h2>
            {relatedDeals.length === 0 ? (
              <p className="text-xs text-text-muted px-2 py-3">案件がありません</p>
            ) : (
              <DataTable
                columns={[
                  {
                    key: "title",
                    header: "案件名",
                    render: (row) => (
                      <Link href={`/deals/${row.id}`} className="text-primary underline">
                        {row.title}
                      </Link>
                    ),
                  },
                  {
                    key: "phase",
                    header: "フェーズ",
                    render: (row) => phaseLabels[row.phase] ?? row.phase,
                  },
                  {
                    key: "estimatedAmount",
                    header: "想定金額",
                    align: "right",
                    render: (row) =>
                      row.estimatedAmount != null
                        ? `¥${row.estimatedAmount.toLocaleString("ja-JP")}`
                        : "-",
                  },
                ]}
                rows={relatedDeals}
                rowKey={(row) => row.id}
                rowHref={(row) => `/deals/${row.id}`}
              />
            )}
          </SectionCard>

          <SectionCard>
            <h2 className="text-xs font-bold text-text px-2 py-1 border-b border-border-light">契約一覧</h2>
            {relatedContracts.length === 0 ? (
              <p className="text-xs text-text-muted px-2 py-3">契約がありません</p>
            ) : (
              <DataTable
                columns={[
                  {
                    key: "title",
                    header: "契約名",
                    render: (row) => (
                      <Link href={`/contracts/${row.id}`} className="text-primary underline">
                        {row.title}
                      </Link>
                    ),
                  },
                  {
                    key: "contractType",
                    header: "種別",
                    render: (row) =>
                      row.contractType
                        ? (contractTypeLabels[row.contractType] ?? row.contractType)
                        : "-",
                  },
                  {
                    key: "amount",
                    header: "金額",
                    align: "right",
                    render: (row) =>
                      row.amount != null
                        ? `¥${row.amount.toLocaleString("ja-JP")}`
                        : "-",
                  },
                  {
                    key: "status",
                    header: "ステータス",
                    render: (row) => contractStatusLabels[row.status] ?? row.status,
                  },
                ]}
                rows={relatedContracts}
                rowKey={(row) => row.id}
                rowHref={(row) => `/contracts/${row.id}`}
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
