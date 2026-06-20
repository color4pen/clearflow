import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import {
  inquiryRepository,
  clientRepository,
  approvalTemplateRepository,
  meetingRepository,
  dealRepository,
} from "@/infrastructure/repositories";
import { SectionCard, DataTable } from "@/app/components";
import { InquiryActions } from "./InquiryActions";
import { statusLabels, sourceLabels, meetingTypeLabels, phaseLabels } from "@/app/(dashboard)/labels";
import type { Meeting } from "@/domain/models/meeting";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const inquiry = await inquiryRepository.findById(id, organizationId);
  if (!inquiry) {
    notFound();
  }

  const [client, templates, meetings, deal] = await Promise.all([
    inquiry.clientId
      ? clientRepository.findById(inquiry.clientId, organizationId)
      : Promise.resolve(null),
    approvalTemplateRepository.findByOrganization(organizationId),
    meetingRepository.findAllByInquiry(id, organizationId),
    dealRepository.findByInquiryId(id, organizationId),
  ]);

  const canChangeStatus =
    session!.user.role === "admin" || session!.user.role === "manager";

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">{inquiry.title}</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/inquiries" className="text-primary underline">引き合い一覧</Link>
          {" > "}詳細
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">引き合い情報</h2>
          <dl className="text-xs space-y-1">
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">件名</dt>
              <dd className="text-text">{inquiry.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">ステータス</dt>
              <dd className="text-text">{statusLabels[inquiry.status] ?? inquiry.status}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">顧客</dt>
              <dd className="text-text">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-primary underline">
                    {client.name}
                  </Link>
                ) : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">流入経路</dt>
              <dd className="text-text">{sourceLabels[inquiry.source] ?? inquiry.source}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">概要</dt>
              <dd className="text-text">{inquiry.description ?? "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">作成日</dt>
              <dd className="text-text">{inquiry.createdAt.toLocaleDateString("ja-JP")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">更新日</dt>
              <dd className="text-text">{inquiry.updatedAt.toLocaleDateString("ja-JP")}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard className="p-3">
          <h2 className="text-xs font-bold text-text mb-2">承認情報</h2>
          {inquiry.conversionRequestId ? (
            <div className="text-xs">
              <p className="text-text-muted mb-1">案件化承認リクエスト</p>
              <Link
                href={`/requests/${inquiry.conversionRequestId}`}
                className="text-primary underline"
              >
                承認リクエストを表示
              </Link>
            </div>
          ) : (
            <p className="text-xs text-text-muted">承認リクエストはありません</p>
          )}
        </SectionCard>
      </div>

      {/* 案件 */}
      <SectionCard className="p-3 mb-2">
        <h2 className="text-xs font-bold text-text mb-2">案件</h2>
        {deal ? (
          <div className="text-xs space-y-1">
            <div className="flex gap-2">
              <span className="text-text-muted w-20 shrink-0">案件名</span>
              <Link href={`/deals/${deal.id}`} className="text-primary underline">
                {deal.title}
              </Link>
            </div>
            <div className="flex gap-2">
              <span className="text-text-muted w-20 shrink-0">フェーズ</span>
              <span className="text-text">
                {phaseLabels[deal.phase] ?? deal.phase}
              </span>
            </div>
            {deal.estimatedAmount != null && (
              <div className="flex gap-2">
                <span className="text-text-muted w-20 shrink-0">想定金額</span>
                <span className="text-text">¥{deal.estimatedAmount.toLocaleString("ja-JP")}</span>
              </div>
            )}
          </div>
        ) : inquiry.status === "converted" ? (
          <div>
            <p className="text-xs text-text-muted mb-2">この引き合いに紐づく案件はありません</p>
            <Link
              href={`/deals/new?inquiryId=${id}`}
              className="text-xs text-primary underline"
            >
              案件を作成
            </Link>
          </div>
        ) : (
          <p className="text-xs text-text-muted">案件はありません</p>
        )}
      </SectionCard>

      {/* 商談履歴 */}
      <SectionCard className="p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">商談履歴</h2>
          <Link
            href={`/inquiries/${id}/meetings/new`}
            className="text-xs text-primary underline"
          >
            商談を記録
          </Link>
        </div>
        {meetings.length === 0 ? (
          <p className="text-xs text-text-muted">商談記録はありません</p>
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
                    href={`/inquiries/${id}/meetings/${row.id}`}
                    className="text-primary underline text-xs"
                  >
                    詳細
                  </Link>
                ),
              },
            ]}
            rows={meetings}
            rowKey={(row) => row.id}
          />
        )}
      </SectionCard>

      {/* ステータス変更 */}
      <SectionCard className="p-3">
        <h2 className="text-xs font-bold text-text mb-2">ステータス変更</h2>
        <InquiryActions
          inquiry={{
            id: inquiry.id,
            status: inquiry.status,
          }}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          canChangeStatus={canChangeStatus}
        />
      </SectionCard>
    </div>
  );
}
