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
import { SectionCard } from "@/app/components";
import { InquiryActions } from "./InquiryActions";
import { MeetingTable } from "./MeetingTable";
import { statusLabels, sourceLabels } from "@/app/(dashboard)/labels";

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

  const meetingRows = meetings.map((m) => ({
    id: m.id,
    type: m.type,
    date: m.date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    location: m.location,
    summary: m.summary,
  }));

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-text">{inquiry.title}</span>
          <span className="text-text-muted text-xs ml-2">
            <Link href="/inquiries" className="text-primary underline">引き合い一覧</Link>
            {" > "}詳細
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 border border-border-light bg-bg-surface">
            {statusLabels[inquiry.status] ?? inquiry.status}
          </span>
          <InquiryActions
            inquiry={{ id: inquiry.id, status: inquiry.status }}
            templates={templates.map((t) => ({ id: t.id, name: t.name }))}
            canChangeStatus={canChangeStatus}
          />
        </div>
      </div>

      <SectionCard className="p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">引き合い情報</h2>
          <Link href={`/inquiries/${id}/edit`} className="text-xs text-primary underline">編集</Link>
        </div>
        <dl className="text-xs space-y-1">
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
            <dt className="text-text-muted w-20 shrink-0">作成日</dt>
            <dd className="text-text">{inquiry.createdAt.toLocaleDateString("ja-JP")}</dd>
          </div>
          {inquiry.conversionRequestId && (
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">案件化承認</dt>
              <dd>
                <Link
                  href={`/requests/${inquiry.conversionRequestId}`}
                  className="text-primary underline"
                >
                  承認済み
                </Link>
              </dd>
            </div>
          )}
          {deal && (
            <div className="flex gap-2">
              <dt className="text-text-muted w-20 shrink-0">案件</dt>
              <dd>
                <Link
                  href={`/deals/${deal.id}`}
                  className="text-primary underline"
                >
                  {deal.title}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </SectionCard>

      {inquiry.description && (
        <SectionCard className="p-3 mb-2">
          <h2 className="text-xs font-bold text-text mb-2">概要</h2>
          <p className="text-xs text-text whitespace-pre-wrap">{inquiry.description}</p>
        </SectionCard>
      )}

      <SectionCard className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">商談履歴</h2>
          <Link
            href={`/inquiries/${id}/meetings/new`}
            className="text-xs text-primary underline"
          >
            商談を記録
          </Link>
        </div>
        {meetingRows.length === 0 ? (
          <p className="text-xs text-text-muted">商談記録はありません</p>
        ) : (
          <MeetingTable meetings={meetingRows} basePath={`/inquiries/${id}/meetings`} />
        )}
      </SectionCard>
    </div>
  );
}
