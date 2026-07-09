import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getDeal, listMeetings, listDealContacts, listContractsByDeal, getClient, listClientContacts, listActionItemsByDeal, listOrganizationUsers, getDealActivity, getWatchStatus } from "@/application/usecases";
import { SectionCard, DataTable } from "@/app/components";
import { DealContactsSection } from "./DealContactsSection";
import { DealNotesSection } from "./DealNotesSection";
import { DealInfoSection } from "./DealInfoSection";
import { DealActionItemsSection } from "./DealActionItemsSection";
import { DealActivitySection } from "./DealActivitySection";
import { DealPhaseStepper } from "./DealPhaseStepper";
import { WatchToggle } from "./WatchToggle";
import { DeleteDealButton } from "./DeleteDealButton";
import {
  contractTypeLabels,
  meetingTypeLabels,
  contractStatusLabels,
  phaseLabels,
} from "@/app/(dashboard)/labels";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";
import { isActivityFeedEnabled } from "@/lib/activityConfig";
import type { Interaction } from "@/domain/models/interaction";

const CONTRACT_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  active: "green",
  completed: "navy",
  cancelled: "red",
};

// deals/page.tsx の PHASE_VARIANT と同期が必要
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

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const deal = await getDeal(id, organizationId);
  if (!deal) {
    notFound();
  }

  const activityEnabled = isActivityFeedEnabled();

  const [dealMeetings, dealContacts, dealContracts, actionItemsResult, users, activityResult, watchStatus] = await Promise.all([
    listMeetings(deal.id, organizationId),
    listDealContacts(deal.id, organizationId),
    listContractsByDeal(deal.id, organizationId),
    listActionItemsByDeal({ dealId: deal.id, organizationId }),
    listOrganizationUsers({ organizationId }),
    activityEnabled ? getDealActivity({ dealId: deal.id, organizationId, dealTitle: deal.title }) : Promise.resolve({ logs: [], targetInfoMap: {} }),
    getWatchStatus({ userId: session!.user.id, dealId: deal.id, organizationId }),
  ]);
  const { logs: activities, targetInfoMap } = activityResult;

  const client = await getClient(deal.clientId, organizationId);
  const clientContacts = await listClientContacts(deal.clientId, organizationId);

  const userMap: Record<string, string> = Object.fromEntries(
    users.map((u) => [u.id, u.name])
  );

  const canChangePhase =
    session!.user.role === "admin" || session!.user.role === "manager";

  return (
    <div>
      {/* ヘッダー: パンくず + ヒーロー行 */}
      <div className="mb-3">
        <div className="text-xs text-text-muted mb-0.5">
          <Link href="/deals" className="text-primary underline">
            案件一覧
          </Link>
          {" > "}
          {deal.title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-bold text-text">{deal.title}</h1>
          <StatusBadge variant={phaseVariant(deal.phase)}>{phaseLabels[deal.phase] ?? deal.phase}</StatusBadge>
          <div className="ml-auto flex items-center gap-3">
            <WatchToggle dealId={deal.id} isWatching={watchStatus.isWatching} />
            {deal.estimateRequestId && (
              <Link
                href={`/requests/${deal.estimateRequestId}`}
                className="text-primary underline"
              >
                見積承認を表示
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* フェーズ進捗: 提案準備 → 提案済 → 交渉中 →（受注/失注）を一本化したステッパー */}
      <SectionCard className="px-4 py-3 mb-3">
        <DealPhaseStepper
          dealId={deal.id}
          phase={deal.phase}
          canChangePhase={canChangePhase}
          inquiryId={deal.inquiryId}
        />
      </SectionCard>

      {/* 2カラムグリッド: 1.5fr : 1fr */}
      <div
        className="grid gap-6 mb-3"
        style={{ gridTemplateColumns: "1.5fr 1fr" }}
      >
        {/* 左カラム */}
        <div className="space-y-3">
          {/* 基本情報 */}
          <SectionCard className="p-3">
            <DealInfoSection deal={deal} editable={canChangePhase} />
            {canChangePhase && dealMeetings.length === 0 && dealContracts.length === 0 && (
              <div className="mt-2">
                <DeleteDealButton dealId={deal.id} />
              </div>
            )}
          </SectionCard>

          {/* 商談記録 */}
          <SectionCard className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-text">商談記録</h2>
              <Link
                href={`/deals/${id}/meetings/new`}
                className="text-xs text-primary underline"
              >
                商談を追加
              </Link>
            </div>
            {dealMeetings.length === 0 ? (
              <p className="text-xs text-text-muted">商談記録がありません</p>
            ) : (
              <DataTable<Interaction>
                columns={[
                  {
                    key: "meetingType",
                    header: "種別",
                    render: (row) => (
                      <span className="text-2xs bg-primary/10 text-primary rounded px-1.5 py-0.5">
                        {row.meetingType ? meetingTypeLabels[row.meetingType] ?? row.meetingType : ""}
                      </span>
                    ),
                  },
                  {
                    key: "date",
                    header: "日時",
                    render: (row) =>
                      row.date.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }),
                  },
                  {
                    key: "link",
                    header: "",
                    render: (row) => (
                      <Link
                        href={`/deals/${id}/meetings/${row.id}`}
                        className="text-primary underline text-xs"
                      >
                        詳細
                      </Link>
                    ),
                  },
                ]}
                rows={dealMeetings}
                rowKey={(row) => row.id}
                rowHref={(row) => `/deals/${id}/meetings/${row.id}`}
              />
            )}
          </SectionCard>
        </div>

        {/* 右カラム */}
        <div className="space-y-3">
          {/* 顧客（会社 + 顧客担当者） */}
          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">顧客</h2>
            {client ? (
              <Link
                href={`/clients/${client.id}`}
                className="text-sm text-primary underline"
              >
                {client.name}
              </Link>
            ) : (
              <span className="text-xs text-text-muted">-</span>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <h3 className="text-xs font-bold text-text-muted mb-1.5">顧客担当者</h3>
              <DealContactsSection
                dealId={deal.id}
                dealContacts={dealContacts}
                clientContacts={clientContacts}
                clientId={deal.clientId}
              />
            </div>
          </SectionCard>

          {/* アクションアイテム */}
          <SectionCard className="p-3">
            <DealActionItemsSection
              actionItems={actionItemsResult.ok ? actionItemsResult.actionItems : []}
              dealId={deal.id}
              orgUsers={users.map((u) => ({ id: u.id, name: u.name }))}
              editable={canChangePhase}
            />
          </SectionCard>

          {/* 契約 */}
          <SectionCard className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-text">契約</h2>
              {deal.phase === "won" && canChangePhase && (
                <Link
                  href={`/contracts/new?dealId=${deal.id}`}
                  className="text-xs text-primary underline"
                >
                  契約を作成
                </Link>
              )}
            </div>
            {dealContracts.length === 0 ? (
              <p className="text-xs text-text-muted">
                {deal.phase === "won"
                  ? "契約がありません"
                  : "契約がありません（受注後に作成できます）"}
              </p>
            ) : (
              <DataTable
                columns={[
                  {
                    key: "title",
                    header: "契約名",
                    render: (row) => (
                      <Link
                        href={`/contracts/${row.id}`}
                        className="text-primary underline"
                      >
                        {row.title}
                      </Link>
                    ),
                  },
                  {
                    key: "contractType",
                    header: "種別",
                    render: (row) =>
                      row.contractType
                        ? contractTypeLabels[row.contractType] ?? row.contractType
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
                    render: (row) => (
                      <StatusBadge variant={CONTRACT_STATUS_VARIANT[row.status] ?? "gray"}>
                        {contractStatusLabels[row.status] ?? row.status}
                      </StatusBadge>
                    ),
                  },
                ]}
                rows={dealContracts}
                rowKey={(row) => row.id}
                rowHref={(row) => `/contracts/${row.id}`}
              />
            )}
          </SectionCard>

        </div>
      </div>

      {/* 備考（グリッド外） */}
      <DealNotesSection dealId={deal.id} notes={deal.notes} editable={canChangePhase} />

      {/* アクティビティ（グリッド外・全幅・最下部） */}
      {activityEnabled && (
        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">アクティビティ</h2>
          <DealActivitySection activities={activities} userMap={userMap} targetInfoMap={targetInfoMap} />
        </SectionCard>
      )}
    </div>
  );
}
