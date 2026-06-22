import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { meetingRepository } from "@/infrastructure/repositories";
import { EditMeetingForm } from "./EditMeetingForm";

export default async function EditMeetingPage({
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

  if (meeting.dealId !== id) {
    notFound();
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-text">商談を編集</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/deals" className="text-primary underline">案件一覧</Link>
          {" > "}
          <Link href={`/deals/${id}`} className="text-primary underline">案件詳細</Link>
          {" > "}
          <Link href={`/deals/${id}/meetings/${meetingId}`} className="text-primary underline">商談詳細</Link>
          {" > "}編集
        </span>
      </div>
      <EditMeetingForm meeting={meeting} dealId={id} />
    </div>
  );
}
