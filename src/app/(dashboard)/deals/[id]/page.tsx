import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getDeal, getInquiry, listMeetings, listDealContacts, listContractsByDeal, getClient, listClientContacts, listActionItemsByDeal, listOrganizationUsers, getDealActivity } from "@/application/usecases";
import { SectionCard, DataTable } from "@/app/components";
import { DealContactsSection } from "./DealContactsSection";
import { DealNotesSection } from "./DealNotesSection";
import { DealInfoSection } from "./DealInfoSection";
import { DealActionItemsSection } from "./DealActionItemsSection";
import { DealActivitySection } from "./DealActivitySection";
import { DealPhaseActions } from "./DealPhaseActions";
import { DealHeaderActions } from "./DealHeaderActions";
import { DeleteDealButton } from "./DeleteDealButton";
import {
  contractTypeLabels,
  meetingTypeLabels,
  contractStatusLabels,
  phaseLabels,
} from "@/app/(dashboard)/labels";
import { isActivityFeedEnabled } from "@/lib/activityConfig";
import type { Meeting } from "@/domain/models/meeting";

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

  const [inquiry, dealMeetings, dealContacts, dealContracts, actionItemsResult, users, activities] = await Promise.all([
    deal.inquiryId ? getInquiry({ inquiryId: deal.inquiryId, organizationId }) : null,
    listMeetings(deal.id, organizationId),
    listDealContacts(deal.id, organizationId),
    listContractsByDeal(deal.id, organizationId),
    listActionItemsByDeal({ dealId: deal.id, organizationId }),
    listOrganizationUsers({ organizationId }),
    activityEnabled ? getDealActivity({ dealId: deal.id, organizationId }) : Promise.resolve([]),
  ]);

  const client = await getClient(deal.clientId, organizationId);
  const clientContacts = await listClientContacts(deal.clientId);

  const userMap: Record<string, string> = Object.fromEntries(
    users.map((u) => [u.id, u.name])
  );

  const canChangePhase =
    session!.user.role === "admin" || session!.user.role === "manager";

  return (
    <div>
      {/* ヘッダー: パンくず + タイトル + 受注/失注ボタン */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-text-muted mb-0.5">
            <Link href="/deals" className="text-primary underline">
              案件一覧
            </Link>
            {" > "}
            {deal.title}
          </div>
          <div className="text-lg font-bold text-text">{deal.title}</div>
          <div className="text-sm text-text-muted">
            {client?.name ?? "-"} · {phaseLabels[deal.phase] ?? deal.phase}
          </div>
        </div>
        <DealHeaderActions
          dealId={deal.id}
          dealPhase={deal.phase}
          canChangePhase={canChangePhase}
        />
      </div>

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

          {/* 関連情報 */}
          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">関連情報</h2>
            <dl className="text-xs space-y-1">
              {deal.inquiryId && (
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">引き合い</dt>
                  <dd className="text-text px-2 py-1">
                    <Link
                      href={`/inquiries/${deal.inquiryId}`}
                      className="text-primary underline text-xs"
                    >
                      {inquiry?.title ?? deal.inquiryId}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">顧客</dt>
                <dd className="text-text px-2 py-1">
                  {client ? (
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-primary underline text-xs"
                    >
                      {client.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              {deal.estimateRequestId && (
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">見積承認</dt>
                  <dd className="text-text px-2 py-1">
                    <Link
                      href={`/requests/${deal.estimateRequestId}`}
                      className="text-primary underline text-xs"
                    >
                      承認リクエストを表示
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </SectionCard>

          {/* フェーズ変更 */}
          {canChangePhase && deal.phase !== "won" && deal.phase !== "lost" && (
            <SectionCard className="p-3">
              <DealPhaseActions deal={deal} canChangePhase={canChangePhase} />
            </SectionCard>
          )}

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
              <DataTable<Meeting>
                columns={[
                  {
                    key: "type",
                    header: "種別",
                    render: (row) => (
                      <span className="text-2xs bg-primary/10 text-primary rounded px-1.5 py-0.5">
                        {meetingTypeLabels[row.type] ?? row.type}
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
          {/* 契約 */}
          <SectionCard className="p-3">
            <div className="flex items-center justify-between bg-[#eef7f1] px-3 py-2 -mx-3 -mt-3 mb-2 rounded-t">
              <h2 className="text-xs font-bold text-[#1a8a4a]">契約</h2>
              {deal.phase === "won" && canChangePhase && (
                <Link
                  href={`/contracts/new?dealId=${deal.id}`}
                  className="text-xs bg-primary text-white font-bold px-4 py-1.5"
                >
                  契約を作成
                </Link>
              )}
            </div>
            {dealContracts.length === 0 ? (
              <p className="text-xs text-text-muted">契約がありません</p>
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
                    render: (row) => contractStatusLabels[row.status] ?? row.status,
                  },
                ]}
                rows={dealContracts}
                rowKey={(row) => row.id}
                rowHref={(row) => `/contracts/${row.id}`}
              />
            )}
          </SectionCard>

          {/* 担当者 */}
          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">担当者</h2>
            <DealContactsSection
              dealId={deal.id}
              dealContacts={dealContacts}
              clientContacts={clientContacts}
              clientId={deal.clientId}
            />
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

          {/* アクティビティ */}
          {activityEnabled && (
            <SectionCard className="p-3">
              <h2 className="text-xs font-bold text-text mb-2">アクティビティ</h2>
              <DealActivitySection activities={activities} userMap={userMap} />
            </SectionCard>
          )}
        </div>
      </div>

      {/* 備考（グリッド外） */}
      <DealNotesSection dealId={deal.id} notes={deal.notes} editable={canChangePhase} />
    </div>
  );
}
