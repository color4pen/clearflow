import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getPipelineSummary } from "@/application/usecases";
import { PageToolbar, ToolbarActions, DataTable, SectionCard } from "@/app/components";
import { phaseLabels, contractTypeLabels } from "@/app/(dashboard)/labels";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";
import { DealsFilter } from "./DealsFilter";
import type { DealWithDetails } from "@/domain/models/deal";

const PHASE_VARIANT: Record<string, StatusBadgeVariant> = {
  hearing: "gray",
  proposal_prep: "blue",
  proposed: "blue",
  negotiation: "blue",
  won: "green",
  lost: "red",
  passed: "gray",
};

function phaseVariant(phase: string): StatusBadgeVariant {
  return PHASE_VARIANT[phase] ?? "gray";
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string; client?: string; contractType?: string }>;
}) {
  const { phase, client, contractType } = await searchParams;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const { summary, deals: allDeals } = await getPipelineSummary(organizationId);

  // Extract unique values for filter options
  const clients = [
    ...new Set(allDeals.map((d) => d.clientName).filter((n): n is string => Boolean(n))),
  ].sort();
  const contractTypes = [
    ...new Set(
      allDeals.map((d) => d.contractType).filter((t): t is NonNullable<typeof t> => t !== null)
    ),
  ].sort();

  // Pipeline summary totals
  const totalCount = summary.reduce((s, i) => s + i.count, 0);
  const totalAmount = summary.reduce((s, i) => s + i.totalAmount, 0);

  // Apply filters
  let filteredDeals: DealWithDetails[] = allDeals;
  if (phase) filteredDeals = filteredDeals.filter((d) => d.phase === phase);
  if (client) filteredDeals = filteredDeals.filter((d) => d.clientName === client);
  if (contractType) filteredDeals = filteredDeals.filter((d) => d.contractType === contractType);

  return (
    <div>
      <PageToolbar
        title="案件管理"
        actions={
          <ToolbarActions>
            <Link href="/deals/new" className="text-xs text-primary underline">
              [新規作成]
            </Link>
          </ToolbarActions>
        }
      />

      {/* パイプラインサマリ */}
      <SectionCard className="p-4 mb-2">
        <div className="grid grid-cols-8">
          {summary.map((item) => (
            <Link
              key={item.phase}
              href={`/deals?phase=${item.phase}`}
              className="block p-3 hover:bg-bg-page text-center border-r border-border"
            >
              <div className="text-xs text-text-muted mb-1">
                {phaseLabels[item.phase] ?? item.phase}
              </div>
              <div className="text-xl font-bold text-text">
                {item.count}
                <span className="text-sm font-normal ml-0.5">件</span>
              </div>
              <div className="text-xs text-text-secondary font-mono">
                ¥{item.totalAmount.toLocaleString("ja-JP")}
              </div>
            </Link>
          ))}
          {/* 合計 */}
          <Link
            href="/deals"
            className="block p-3 hover:bg-bg-page text-center"
          >
            <div className="text-xs text-text-muted mb-1">合計</div>
            <div className="text-xl font-bold text-text">
              {totalCount}
              <span className="text-sm font-normal ml-0.5">件</span>
            </div>
            <div className="text-xs text-text-secondary font-mono">
              ¥{totalAmount.toLocaleString("ja-JP")}
            </div>
          </Link>
        </div>
      </SectionCard>

      {/* フィルタ */}
      <div className="mb-2">
        <DealsFilter
          currentPhase={phase ?? ""}
          currentClient={client ?? ""}
          currentContractType={contractType ?? ""}
          clients={clients}
          contractTypes={contractTypes}
        />
      </div>

      <SectionCard className="p-2">
        {filteredDeals.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">案件はありません</p>
        ) : (
          <DataTable<DealWithDetails>
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
                key: "clientName",
                header: "顧客名",
                render: (row) => row.clientName,
              },
              {
                key: "phase",
                header: "フェーズ",
                render: (row) => (
                  <StatusBadge variant={phaseVariant(row.phase)}>
                    {phaseLabels[row.phase] ?? row.phase}
                  </StatusBadge>
                ),
              },
              {
                key: "contractType",
                header: "契約形態",
                render: (row) =>
                  row.contractType
                    ? contractTypeLabels[row.contractType] ?? row.contractType
                    : "-",
              },
              {
                key: "estimatedAmount",
                header: "想定金額",
                align: "right",
                render: (row) =>
                  row.estimatedAmount != null ? (
                    <span className="font-mono">
                      ¥{row.estimatedAmount.toLocaleString("ja-JP")}
                    </span>
                  ) : (
                    "-"
                  ),
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
