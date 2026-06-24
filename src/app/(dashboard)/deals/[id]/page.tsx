import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import {
  dealRepository,
  inquiryRepository,
  clientRepository,
  meetingRepository,
  dealContactRepository,
  contractRepository,
} from "@/infrastructure/repositories";
import { SectionCard, DataTable } from "@/app/components";
import { DealContactsSection } from "./DealContactsSection";
import { DealNotesSection } from "./DealNotesSection";
import { DealInfoSection } from "./DealInfoSection";
import { DealActionItemsSection } from "./DealActionItemsSection";
import { DeleteDealButton } from "./DeleteDealButton";
import { contractTypeLabels, meetingTypeLabels, contractStatusLabels } from "@/app/(dashboard)/labels";
import type { Meeting } from "@/domain/models/meeting";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const deal = await dealRepository.findById(id, organizationId);
  if (!deal) {
    notFound();
  }

  // 引き合いは inquiryId がある場合のみ取得する
  const [inquiry, dealMeetings, dealContacts, dealContracts] = await Promise.all([
    deal.inquiryId ? inquiryRepository.findById(deal.inquiryId, organizationId) : null,
    meetingRepository.findAllByDeal(deal.id, organizationId),
    dealContactRepository.findByDeal(deal.id, organizationId),
    contractRepository.findAllByDealId(deal.id, organizationId),
  ]);

  // 顧客情報は deal.clientId で直接取得する
  const client = await clientRepository.findById(deal.clientId, organizationId);

  const clientContacts = await clientRepository.findContactsByClientId(deal.clientId);

  const canChangePhase =
    session!.user.role === "admin" || session!.user.role === "manager";

  // 全商談のアクションアイテムを集約する（完了・未完了とも表示）
  const flatActionItems = dealMeetings.flatMap((m) =>
    m.actionItems.map((item, index) => ({
      meetingId: m.id,
      dealId: deal.id,
      meetingLabel: `${meetingTypeLabels[m.type] ?? m.type} ${m.date.toLocaleDateString("ja-JP")}`,
      actionItem: item,
      index,
    }))
  );

  const allMeetingActionItems = dealMeetings.map((m) => ({
    meetingId: m.id,
    dealId: deal.id,
    actionItems: m.actionItems,
  }));

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{deal.title}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/deals" className="text-primary underline">案件一覧</Link>
          {" > "}詳細
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SectionCard className="p-3">
          <DealInfoSection deal={deal} editable={canChangePhase} />
          {canChangePhase && dealMeetings.length === 0 && dealContracts.length === 0 && (
            <div className="mt-2">
              <DeleteDealButton dealId={deal.id} />
            </div>
          )}
        </SectionCard>

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
                  <Link href={`/clients/${client.id}`} className="text-primary underline text-xs">
                    {client.name}
                  </Link>
                ) : "-"}
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
      </div>

      <DealNotesSection dealId={deal.id} notes={deal.notes} editable={canChangePhase} />

      {/* 契約 */}
      {deal.phase === "won" && (
        <SectionCard className="p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-text">契約</h2>
            {canChangePhase && (
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
                    <Link href={`/contracts/${row.id}`} className="text-primary underline">
                      {row.title}
                    </Link>
                  ),
                },
                {
                  key: "contractType",
                  header: "種別",
                  render: (row) => row.contractType ? contractTypeLabels[row.contractType] ?? row.contractType : "-",
                },
                {
                  key: "amount",
                  header: "金額",
                  align: "right",
                  render: (row) => row.amount != null ? `¥${row.amount.toLocaleString("ja-JP")}` : "-",
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
      )}

      {/* 担当者 */}
      <SectionCard className="p-3 mb-2">
        <h2 className="text-xs font-bold text-text mb-2">担当者</h2>
        <DealContactsSection
          dealId={deal.id}
          dealContacts={dealContacts}
          clientContacts={clientContacts}
          clientId={deal.clientId}
        />
      </SectionCard>

      {/* アクションアイテム */}
      <SectionCard className="p-3 mb-2">
        <h2 className="text-xs font-bold text-text mb-2">アクションアイテム</h2>
        <DealActionItemsSection
          items={flatActionItems}
          allMeetingActionItems={allMeetingActionItems}
          editable={canChangePhase}
        />
      </SectionCard>

      {/* 商談履歴 */}
      <SectionCard className="p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">商談履歴</h2>
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
                render: (row) => meetingTypeLabels[row.type] ?? row.type,
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
                key: "location",
                header: "場所",
                render: (row) => row.location ?? "-",
              },
              {
                key: "attendees",
                header: "参加者数",
                align: "right",
                render: (row) =>
                  String(row.attendees.length),
              },
              {
                key: "actionItems",
                header: "AI件数",
                align: "right",
                render: (row) => String(row.actionItems.length),
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
  );
}
