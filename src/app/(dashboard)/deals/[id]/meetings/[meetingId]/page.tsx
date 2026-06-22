import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { meetingRepository } from "@/infrastructure/repositories";
import { SectionCard } from "@/app/components";
import { meetingTypeLabels } from "@/app/(dashboard)/labels";

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

  if (meeting.dealId !== id) {
    notFound();
  }

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
        <Link
          href={`/deals/${id}/meetings/${meetingId}/edit`}
          className="text-xs text-primary underline"
        >
          編集
        </Link>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 2fr" }}>
        {/* 左カラム: 基本情報 */}
        <div className="space-y-2">
          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">商談情報</h2>
            <dl className="text-xs space-y-1">
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">種別</dt>
                <dd className="text-text">{meetingTypeLabels[meeting.type] ?? meeting.type}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">日時</dt>
                <dd className="text-text">
                  {meeting.date.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-text-muted w-24 shrink-0">場所</dt>
                <dd className="text-text">{meeting.location ?? "-"}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">参加者</h2>
            <div className="text-xs space-y-2">
              <div>
                <p className="text-text-muted font-bold mb-0.5">社内</p>
                {meeting.attendees.internal.length === 0 ? (
                  <p className="text-text-muted">-</p>
                ) : (
                  <ul className="list-disc list-inside text-text">
                    {meeting.attendees.internal.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-text-muted font-bold mb-0.5">社外</p>
                {meeting.attendees.external.length === 0 ? (
                  <p className="text-text-muted">-</p>
                ) : (
                  <ul className="list-disc list-inside text-text">
                    {meeting.attendees.external.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </SectionCard>

          {meeting.type === "hearing" && meeting.hearingData && (
            <SectionCard className="p-3">
              <h2 className="text-xs font-bold text-text mb-2">ヒアリング項目</h2>
              <dl className="text-xs space-y-1">
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">課題</dt>
                  <dd className="text-text whitespace-pre-wrap">{meeting.hearingData.challenge ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">予算感</dt>
                  <dd className="text-text">{meeting.hearingData.budget ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">決裁者</dt>
                  <dd className="text-text">{meeting.hearingData.decisionMaker ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">時期</dt>
                  <dd className="text-text">{meeting.hearingData.timeline ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">競合状況</dt>
                  <dd className="text-text whitespace-pre-wrap">{meeting.hearingData.competitors ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-text-muted w-24 shrink-0">備考</dt>
                  <dd className="text-text whitespace-pre-wrap">{meeting.hearingData.notes ?? "-"}</dd>
                </div>
              </dl>
            </SectionCard>
          )}
        </div>

        {/* 右カラム: 議事録 + アクションアイテム */}
        <div className="space-y-2">
          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">議事録</h2>
            {meeting.summary ? (
              <p className="text-xs text-text whitespace-pre-wrap">{meeting.summary}</p>
            ) : (
              <p className="text-xs text-text-muted">議事録はありません</p>
            )}
          </SectionCard>

          <SectionCard className="p-3">
            <h2 className="text-xs font-bold text-text mb-2">アクションアイテム</h2>
            {meeting.actionItems.length === 0 ? (
              <p className="text-xs text-text-muted">アクションアイテムはありません</p>
            ) : (
              <ul className="text-xs space-y-1">
                {meeting.actionItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span className={item.done ? "text-text-muted line-through" : "text-text"}>
                      {item.description}
                    </span>
                    <span className="text-text-muted">（{item.assignee}）</span>
                    {item.dueDate && (
                      <span className="text-text-muted">{item.dueDate}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
