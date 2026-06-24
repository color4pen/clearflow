import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { meetingRepository, dealRepository, clientRepository } from "@/infrastructure/repositories";
import { listOrganizationUsers } from "@/application/usecases";
import { SectionCard } from "@/app/components";
import { meetingTypeLabels } from "@/app/(dashboard)/labels";
import { MeetingInfoSection } from "./MeetingInfoSection";
import { MeetingSummarySection } from "./MeetingSummarySection";
import { MeetingActionItemsSection } from "./MeetingActionItemsSection";

export default async function DealMeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>;
}) {
  const { id, meetingId } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const meeting = await meetingRepository.findById(meetingId, organizationId);
  if (!meeting) {
    notFound();
  }

  if (!meeting.dealId || meeting.dealId !== id) {
    notFound();
  }

  const deal = await dealRepository.findById(id, organizationId);
  const [users, contacts] = await Promise.all([
    listOrganizationUsers({ organizationId }),
    deal?.clientId ? clientRepository.findContactsByClientId(deal.clientId) : Promise.resolve([]),
  ]);

  const editable =
    session!.user.role === "admin" || session!.user.role === "manager";

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-text">
            {meetingTypeLabels[meeting.type] ?? meeting.type}
          </span>
          <span className="text-text-muted text-xs ml-2">
            <Link href="/deals" className="text-primary underline">案件一覧</Link>
            {" > "}
            <Link href={`/deals/${id}`} className="text-primary underline">案件詳細</Link>
            {" > "}商談詳細
          </span>
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 2fr" }}>
        {/* 左カラム: 基本情報 */}
        <div>
          <MeetingInfoSection
            meetingId={meetingId}
            dealId={id}
            meeting={{
              type: meeting.type,
              date: meeting.date,
              location: meeting.location,
              attendees: meeting.attendees,
              hearingData: meeting.hearingData,
            }}
            editable={editable}
            orgUsers={users.map((u) => ({ id: u.id, name: u.name }))}
            existingContacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
            clientId={deal?.clientId ?? null}
          />
        </div>

        {/* 右カラム: 議事録 + アクションアイテム */}
        <div className="space-y-2">
          <SectionCard className="p-3">
            <MeetingSummarySection
              meetingId={meetingId}
              dealId={id}
              summary={meeting.summary}
              editable={editable}
            />
          </SectionCard>

          <SectionCard className="p-3">
            <MeetingActionItemsSection
              meetingId={meetingId}
              dealId={id}
              actionItems={meeting.actionItems}
              editable={editable}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
