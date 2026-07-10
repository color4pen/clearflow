import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listContracts } from "@/application/usecases";
import { PageToolbar, SectionCard, DataTable, EmptyState } from "@/app/components";
import { contractStatusLabels, contractTypeLabels } from "@/app/(dashboard)/labels";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";
import { isExpiringWithin30Days } from "@/domain/services/contractHighlight";
import type { ContractWithClient } from "@/domain/models/contract";

const CONTRACT_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  active: "green",
  completed: "navy",
  cancelled: "red",
};

export default async function ContractsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const contracts = await listContracts(organizationId);

  return (
    <div>
      <PageToolbar title="契約管理" />

      <SectionCard className="p-2 mt-2">
        {contracts.length === 0 ? (
          <EmptyState icon="📁" message="契約はありません" />
        ) : (
          <DataTable<ContractWithClient>
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
                key: "clientName",
                header: "顧客名",
                render: (row) => row.clientName,
              },
              {
                key: "dealTitle",
                header: "案件名",
                render: (row) => row.dealTitle,
              },
              {
                key: "contractType",
                header: "契約種別",
                render: (row) =>
                  row.contractType ? (contractTypeLabels[row.contractType] ?? row.contractType) : "-",
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
                key: "period",
                header: "期間",
                render: (row) => {
                  const start = row.startDate.toLocaleDateString("ja-JP");
                  const end = row.endDate ? row.endDate.toLocaleDateString("ja-JP") : null;
                  return end ? `${start} 〜 ${end}` : `${start} 〜`;
                },
              },
              {
                key: "status",
                header: "ステータス",
                render: (row) => (
                  <StatusBadge variant={CONTRACT_STATUS_VARIANT[row.status] ?? "gray"}>
                    {contractStatusLabels[row.status] ?? row.status}
                  </StatusBadge>
                ),
              },
            ]}
            rows={contracts}
            rowKey={(row) => row.id}
            rowHref={(row) => `/contracts/${row.id}`}
            rowClass={(row) =>
              isExpiringWithin30Days(row) ? "bg-bg-row-pending" : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
