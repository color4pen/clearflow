import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listDeals } from "@/application/usecases";
import { PageToolbar, DataTable, SectionCard } from "@/app/components";
import { phaseLabels } from "@/app/(dashboard)/labels";
import type { DealWithInquiry } from "@/domain/models/deal";

const allPhases = [
  "proposal_prep",
  "proposed",
  "negotiation",
  "won",
  "lost",
] as const;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const { phase } = await searchParams;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const allDeals = await listDeals(organizationId);

  const filteredDeals = phase
    ? allDeals.filter((d) => d.phase === phase)
    : allDeals;

  return (
    <div>
      <PageToolbar title="案件管理" />

      <div className="mt-2 mb-2 flex gap-2 flex-wrap">
        <Link
          href="/deals"
          className={`text-xs px-2 py-0.5 border ${!phase ? "bg-primary text-white border-primary" : "border-border text-text-muted hover:text-text"}`}
        >
          全て
        </Link>
        {allPhases.map((p) => (
          <Link
            key={p}
            href={`/deals?phase=${p}`}
            className={`text-xs px-2 py-0.5 border ${phase === p ? "bg-primary text-white border-primary" : "border-border text-text-muted hover:text-text"}`}
          >
            {phaseLabels[p]}
          </Link>
        ))}
      </div>

      <SectionCard className="p-2">
        {filteredDeals.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">案件はありません</p>
        ) : (
          <DataTable<DealWithInquiry>
            columns={[
              {
                key: "phase",
                header: "フェーズ",
                render: (row) => phaseLabels[row.phase] ?? row.phase,
              },
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
                key: "clientName",
                header: "顧客名",
                render: (row) => row.clientName,
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
              {
                key: "assigneeName",
                header: "担当者",
                render: (row) => row.assigneeName ?? "-",
              },
            ]}
            rows={filteredDeals}
            rowKey={(row) => row.id}
            rowHref={(row) => `/deals/${row.id}`}
          />
        )}
      </SectionCard>
    </div>
  );
}
