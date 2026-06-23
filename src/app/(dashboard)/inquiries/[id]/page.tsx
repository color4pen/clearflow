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
import { InquiryInfoSection } from "./InquiryInfoSection";
import { phaseLabels } from "@/app/(dashboard)/labels";

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

  const [client, deal, clients] = await Promise.all([
    inquiry.clientId
      ? clientRepository.findById(inquiry.clientId, organizationId)
      : Promise.resolve(null),
    dealRepository.findByInquiryId(id, organizationId),
    inquiry.clientId ? Promise.resolve([]) : clientRepository.findAllByOrganization(organizationId),
  ]);

  const canChangeStatus =
    session!.user.role === "admin" || session!.user.role === "manager";
  const editable = canChangeStatus;

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
        <InquiryInfoSection
          inquiry={{
            id: inquiry.id,
            title: inquiry.title,
            source: inquiry.source,
            description: inquiry.description,
            clientId: inquiry.clientId,
            assigneeId: inquiry.assigneeId ?? null,
            status: inquiry.status,
          }}
          editable={editable}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          clientName={client?.name ?? null}
          clientLinkId={client?.id ?? null}
        />
        <dl className="text-xs space-y-1 mt-1">
          <div className="flex gap-2">
            <dt className="text-text-muted w-20 shrink-0">作成日</dt>
            <dd className="text-text px-2 py-1">{inquiry.createdAt.toLocaleDateString("ja-JP")}</dd>
          </div>
        </dl>
        {canChangeStatus && !deal && (
          <div className="mt-2">
            <DeleteInquiryButton inquiryId={id} />
          </div>
        )}
      </SectionCard>

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
