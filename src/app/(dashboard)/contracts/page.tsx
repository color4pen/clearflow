import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listContracts } from "@/application/usecases";
import { PageToolbar, SectionCard, DataTable } from "@/app/components";
import { contractStatusLabels, contractTypeLabels } from "@/app/(dashboard)/labels";
import type { ContractWithClient } from "@/domain/models/contract";

export default async function ContractsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const contracts = await listContracts(organizationId);

  return (
    <div>
      <PageToolbar title="契約管理" />

      <SectionCard className="p-2 mt-2">
        {contracts.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">契約はありません</p>
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
                key: "status",
                header: "ステータス",
                render: (row) => contractStatusLabels[row.status] ?? row.status,
              },
            ]}
            rows={contracts}
            rowKey={(row) => row.id}
            rowHref={(row) => `/contracts/${row.id}`}
          />
        )}
      </SectionCard>
    </div>
  );
}
