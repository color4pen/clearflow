import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import {
  inquiryRepository,
  clientRepository,
  dealRepository,
} from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { InquiryActions } from "./InquiryActions";
import { DeleteInquiryButton } from "./DeleteInquiryButton";
import { statusLabels, sourceLabels, phaseLabels } from "@/app/(dashboard)/labels";

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

  const [client, deal] = await Promise.all([
    inquiry.clientId
      ? clientRepository.findById(inquiry.clientId, organizationId)
      : Promise.resolve(null),
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

      <SectionCard className="p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">引き合い情報</h2>
          <div className="flex items-center gap-3">
            {canChangeStatus && !deal && (
              <DeleteInquiryButton inquiryId={id} />
            )}
            <Link href={`/inquiries/${id}/edit`} className="text-xs text-primary underline">編集</Link>
          </div>
        </div>
        <dl className="text-xs space-y-1">
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
            <dt className="text-text-muted w-20 shrink-0">作成日</dt>
            <dd className="text-text">{inquiry.createdAt.toLocaleDateString("ja-JP")}</dd>
          </div>
        </dl>
      </SectionCard>

      {inquiry.description && (
        <SectionCard className="p-3 mb-2">
          <h2 className="text-xs font-bold text-text mb-2">概要</h2>
          <p className="text-xs text-text whitespace-pre-wrap">{inquiry.description}</p>
        </SectionCard>
      )}

      <SectionCard className="p-3 mb-2">
        <h2 className="text-xs font-bold text-text mb-2">
          {inquiry.status === "converted" ? "案件" : "ステータス変更"}
        </h2>
        {inquiry.status === "converted" && deal ? (
          <div className="text-xs">
            <Link href={`/deals/${deal.id}`} className="text-primary underline font-bold">
              {deal.title}
            </Link>
            <span className="text-text-muted ml-2">{phaseLabels[deal.phase] ?? deal.phase}</span>
          </div>
        ) : inquiry.status === "converted" && !deal ? (
          <p className="text-xs text-text-muted">案件化済み（案件データなし）</p>
        ) : (
          <InquiryActions
            inquiry={{ id: inquiry.id, status: inquiry.status }}
            canChangeStatus={canChangeStatus}
          />
        )}
      </SectionCard>

    </div>
  );
}
