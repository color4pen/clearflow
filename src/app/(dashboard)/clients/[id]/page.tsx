import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { clientRepository, inquiryRepository, dealRepository } from "@/infrastructure/repositories";
import { SectionCard, DataTable } from "@/app/components";
import { statusLabels, sourceLabels, phaseLabels } from "@/app/(dashboard)/labels";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const [client, contacts, relatedInquiries] = await Promise.all([
    clientRepository.findById(id, organizationId),
    clientRepository.findContactsByClientId(id),
    inquiryRepository.findByClientId(id, organizationId),
  ]);

  // 引き合い経由で関連する案件を並列取得（N+1 を Promise.all で解消）
  const relatedDeals = client
    ? (
        await Promise.all(
          relatedInquiries.map((inq) => dealRepository.findByInquiryId(inq.id, organizationId))
        )
      ).filter((d): d is NonNullable<typeof d> => d !== null)
    : [];

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

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SectionCard className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-text">企業情報</h2>
            <Link href={`/clients/${id}/edit`} className="text-xs text-primary underline">編集</Link>
          </div>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-16 shrink-0">業種</dt>
              <dd className="text-text">{client.industry ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-16 shrink-0">規模</dt>
              <dd className="text-text">{client.size ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-16 shrink-0">所在地</dt>
              <dd className="text-text">{client.address ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-16 shrink-0">備考</dt>
              <dd className="text-text">{client.notes ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-16 shrink-0">登録日</dt>
              <dd className="text-text">{client.createdAt.toLocaleDateString("ja-JP")}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard className="mb-3">
        <h2 className="text-xs font-bold text-text px-2 py-1 border-b border-border-light">担当者一覧</h2>
        {contacts.length === 0 ? (
          <p className="text-xs text-text-muted px-2 py-3">担当者が登録されていません</p>
        ) : (
          <DataTable
            columns={[
              { key: "name", header: "氏名", render: (row) => <>{row.name}{row.isPrimary && <span className="ml-1 text-xs text-primary">[主]</span>}</> },
              { key: "department", header: "部署", render: (row) => row.department ?? "-" },
              { key: "position", header: "役職", render: (row) => row.position ?? "-" },
              { key: "email", header: "メール", render: (row) => row.email ?? "-" },
              { key: "phone", header: "電話", render: (row) => row.phone ?? "-" },
            ]}
            rows={contacts}
            rowKey={(row) => row.id}
          />
        )}
      </SectionCard>

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

      <SectionCard className="mt-3">
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
    </div>
  );
}
