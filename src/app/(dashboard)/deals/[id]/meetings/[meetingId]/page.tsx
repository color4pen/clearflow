import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listOrganizationUsers, getMeeting, getDeal, listClientContacts, listActionItemsByMeeting } from "@/application/usecases";
import { SectionCard } from "@/app/components";
import { meetingTypeLabels } from "@/app/(dashboard)/labels";
import { MeetingInfoSection } from "./MeetingInfoSection";
import { MeetingAttendeesSection } from "./MeetingAttendeesSection";
import { MeetingHearingSection } from "./MeetingHearingSection";
import { MeetingSummarySection } from "./MeetingSummarySection";
import { MeetingPreparationSection } from "./MeetingPreparationSection";
import { MeetingActionItemsSection } from "./MeetingActionItemsSection";

export default async function DealMeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>;
}) {
  const { id, meetingId } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const meeting = await getMeeting(meetingId, organizationId);
  if (!meeting) {
    notFound();
  }

  if (meeting.dealId !== id) {
    notFound();
  }

  const deal = await getDeal(id, organizationId);
  const [users, contacts, actionItemsResult] = await Promise.all([
    listOrganizationUsers({ organizationId }),
    deal?.clientId ? listClientContacts(deal.clientId, organizationId) : Promise.resolve([]),
    listActionItemsByMeeting({ meetingId, organizationId }),
  ]);

  const editable =
    session!.user.role === "admin" || session!.user.role === "manager";

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-text">
            {meeting.meetingType ? meetingTypeLabels[meeting.meetingType] : ""}
          </span>
          <span className="text-text-muted text-xs ml-2">
            <Link href="/deals" className="text-primary underline">案件一覧</Link>
            {" > "}
            <Link href={`/deals/${id}`} className="text-primary underline">案件詳細</Link>
            {" > "}商談詳細
          </span>
        </div>
      </div>

      {/* ヘッダー領域: 基本情報（表示/編集切替） */}
      <div className="mb-2">
        <MeetingInfoSection
          meetingId={meetingId}
          dealId={id}
          meeting={{
            meetingType: meeting.meetingType,
            date: meeting.date,
            location: meeting.location,
          }}
          editable={editable}
        />
      </div>

      {/* メインコンテンツグリッド */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "1.6fr 1fr", gap: "24px" }}
      >
        {/* 左カラム: 事前準備 + 議事録 + ヒアリング情報 */}
        <div className="space-y-6">
          <SectionCard className="p-3">
            <MeetingPreparationSection
              meetingId={meetingId}
              dealId={id}
              preparation={meeting.preparation}
              editable={editable}
            />
          </SectionCard>

          <SectionCard className="p-3">
            <MeetingSummarySection
              meetingId={meetingId}
              dealId={id}
              summary={meeting.summary}
              editable={editable}
            />
          </SectionCard>

          {meeting.meetingType === "hearing" && (
            <MeetingHearingSection
              meetingId={meetingId}
              dealId={id}
              details={meeting.details}
              editable={editable}
            />
          )}
        </div>

        {/* 右カラム: 出席者 + アクションアイテム */}
        <div className="space-y-6">
          <MeetingAttendeesSection
            meetingId={meetingId}
            dealId={id}
            attendees={meeting.attendees}
            editable={editable}
            orgUsers={users.map((u) => ({ id: u.id, name: u.name }))}
            existingContacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
            clientId={deal?.clientId ?? null}
          />

          <SectionCard className="p-3">
            <MeetingActionItemsSection
              interactionId={meetingId}
              dealId={id}
              actionItems={actionItemsResult.ok ? actionItemsResult.actionItems : []}
              orgUsers={users.map((u) => ({ id: u.id, name: u.name }))}
              editable={editable}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
