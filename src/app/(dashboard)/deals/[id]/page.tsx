import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import {
  dealRepository,
  inquiryRepository,
  clientRepository,
  meetingRepository,
  dealContactRepository,
} from "@/infrastructure/repositories";
import { SectionCard, DataTable } from "@/app/components";
import { DealPhaseActions } from "./DealPhaseActions";
import { DealEditForm } from "./DealEditForm";
import { DealContactsSection } from "./DealContactsSection";
import { phaseLabels, contractTypeLabels, meetingTypeLabels } from "@/app/(dashboard)/labels";
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

  const [inquiry, dealMeetings, dealContacts] = await Promise.all([
    inquiryRepository.findById(deal.inquiryId, organizationId),
    deal.inquiryId
      ? meetingRepository.findAllByInquiryOrDeal(deal.inquiryId, organizationId)
      : meetingRepository.findAllByDeal(deal.id, organizationId),
    dealContactRepository.findByDeal(deal.id, organizationId),
  ]);

  const client =
    inquiry?.clientId
      ? await clientRepository.findById(inquiry.clientId, organizationId)
      : null;

  const clientContacts = inquiry?.clientId
    ? await clientRepository.findContactsByClientId(inquiry.clientId)
    : [];

  const canChangePhase =
    session!.user.role === "admin" || session!.user.role === "manager";

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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-text">案件情報</h2>
            <Link href={`/deals/${id}/edit`} className="text-xs text-primary underline">編集</Link>
          </div>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">案件名</dt>
              <dd className="text-text">{deal.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">フェーズ</dt>
              <dd className="text-text">{phaseLabels[deal.phase] ?? deal.phase}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">想定金額</dt>
              <dd className="text-text">
                {deal.estimatedAmount != null
                  ? `¥${deal.estimatedAmount.toLocaleString("ja-JP")}`
                  : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">想定開始日</dt>
              <dd className="text-text">
                {deal.estimatedStartDate
                  ? deal.estimatedStartDate.toLocaleDateString("ja-JP")
                  : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">想定終了日</dt>
              <dd className="text-text">
                {deal.estimatedEndDate
                  ? deal.estimatedEndDate.toLocaleDateString("ja-JP")
                  : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">契約種別</dt>
              <dd className="text-text">
                {deal.contractType ? contractTypeLabels[deal.contractType] ?? deal.contractType : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">備考</dt>
              <dd className="text-text">{deal.notes ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">作成日</dt>
              <dd className="text-text">{deal.createdAt.toLocaleDateString("ja-JP")}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">関連情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">引き合い</dt>
              <dd className="text-text">
                <Link
                  href={`/inquiries/${deal.inquiryId}`}
                  className="text-primary underline"
                >
                  {inquiry?.title ?? deal.inquiryId}
                </Link>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-24 shrink-0">顧客</dt>
              <dd className="text-text">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-primary underline">
                    {client.name}
                  </Link>
                ) : "-"}
              </dd>
            </div>
            {deal.estimateRequestId && (
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">見積承認</dt>
                <dd className="text-text">
                  <Link
                    href={`/requests/${deal.estimateRequestId}`}
                    className="text-primary underline"
                  >
                    承認リクエストを表示
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </SectionCard>
      </div>

      {/* フェーズ変更 */}
      <SectionCard className="p-3 mb-2">
        <h2 className="text-xs font-bold text-text mb-2">フェーズ変更</h2>
        <DealPhaseActions
          deal={{ id: deal.id, phase: deal.phase }}
          canChangePhase={canChangePhase}
        />
      </SectionCard>

      {/* 担当者 */}
      <SectionCard className="p-3 mb-2">
        <h2 className="text-xs font-bold text-text mb-2">担当者</h2>
        <DealContactsSection
          dealId={deal.id}
          dealContacts={dealContacts}
          clientContacts={clientContacts}
          clientId={inquiry?.clientId ?? null}
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
                  String(row.attendees.internal.length + row.attendees.external.length),
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
                    href={
                      row.inquiryId
                        ? `/inquiries/${row.inquiryId}/meetings/${row.id}`
                        : `/deals/${id}/meetings/${row.id}`
                    }
                    className="text-primary underline text-xs"
                  >
                    詳細
                  </Link>
                ),
              },
            ]}
            rows={dealMeetings}
            rowKey={(row) => row.id}
          />
        )}
      </SectionCard>

    </div>
  );
}
