import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getInquiry, getClient, getDealByInquiry, listClients, listMeetingsByInquiry, findPendingApprovalByTrigger } from "@/application/usecases";
import { SectionCard } from "@/app/components";
import { InquiryActions } from "./InquiryActions";
import { DeleteInquiryButton } from "./DeleteInquiryButton";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";
import { statusLabels } from "@/app/(dashboard)/labels";

const INQUIRY_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  new: "gray",
  converted: "green",
  declined: "gray",
};
import { InquiryStatusBanner } from "./InquiryStatusBanner";
import { InquiryInfoDisplay } from "./InquiryInfoDisplay";
import { InquiryCustomerSection } from "./InquiryCustomerSection";
import { InquiryMeetingSection } from "./InquiryMeetingSection";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const inquiry = await getInquiry({ inquiryId: id, organizationId });
  if (!inquiry) {
    notFound();
  }

  const [client, deal, clients, meetings, pendingRequest] = await Promise.all([
    inquiry.clientId
      ? getClient(inquiry.clientId, organizationId)
      : Promise.resolve(null),
    getDealByInquiry(id, organizationId),
    inquiry.clientId
      ? Promise.resolve([])
      : listClients(organizationId),
    listMeetingsByInquiry(id, organizationId),
    findPendingApprovalByTrigger(organizationId, "inquiry.convert", id),
  ]);

  const canChangeStatus =
    session!.user.role === "admin" || session!.user.role === "manager";
  const editable = canChangeStatus;

  const dealMeetingNewPath = deal ? `/deals/${deal.id}/meetings/new` : null;

  return (
    <div>
      {/* Breadcrumb + title */}
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2 flex items-center gap-2">
        <span className="text-xs text-text-muted">
          <Link href="/inquiries" className="text-primary underline">引合一覧</Link>
          {" / "}
          <span className="text-text">{inquiry.title}</span>
        </span>
        <StatusBadge variant={INQUIRY_STATUS_VARIANT[inquiry.status] ?? "gray"}>
          {statusLabels[inquiry.status] ?? inquiry.status}
        </StatusBadge>
      </div>

      {/* Status banner */}
      <InquiryStatusBanner
        status={inquiry.status}
        dealId={deal?.id ?? null}
        dealTitle={deal?.title ?? null}
        hasPendingApproval={pendingRequest !== null}
      />

      {/* 2-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Basic info section */}
          <SectionCard className="p-3">
            <InquiryInfoDisplay
              inquiry={{
                id: inquiry.id,
                title: inquiry.title,
                source: inquiry.source,
                description: inquiry.description,
                contactNote: inquiry.contactNote,
                clientId: inquiry.clientId,
                assigneeId: inquiry.assigneeId ?? null,
                status: inquiry.status,
              }}
              editable={editable}
            />
            <dl className="text-xs mt-2">
              <div
                style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "4px 8px" }}
              >
                <div className="text-text-muted py-1">作成日</div>
                <div className="text-text py-1">
                  {inquiry.createdAt.toLocaleDateString("ja-JP")}
                </div>
              </div>
            </dl>
          </SectionCard>

          {/* Customer section */}
          <SectionCard className="p-3">
            <InquiryCustomerSection
              inquiryId={inquiry.id}
              inquiryTitle={inquiry.title}
              inquirySource={inquiry.source}
              inquiryDescription={inquiry.description}
              inquiryContactNote={inquiry.contactNote}
              clientId={inquiry.clientId}
              clientName={client?.name ?? null}
              clientLinkId={client?.id ?? null}
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              editable={editable}
            />
          </SectionCard>

          {/* Actions section */}
          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">操作</h2>
            {inquiry.status !== "converted" && (
              <InquiryActions
                inquiry={{ id: inquiry.id, status: inquiry.status }}
                canChangeStatus={canChangeStatus}
              />
            )}
            {canChangeStatus && !deal && inquiry.status !== "converted" && (
              <div className="mt-2">
                <DeleteInquiryButton inquiryId={id} />
              </div>
            )}
            {inquiry.status === "converted" && !deal && (
              <p className="text-xs text-text-muted">案件化済み（案件データなし）</p>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div>
          <SectionCard className="p-3">
            <InquiryMeetingSection
              meetings={meetings}
              dealMeetingNewPath={dealMeetingNewPath}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
