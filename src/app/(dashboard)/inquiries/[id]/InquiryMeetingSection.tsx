import Link from "next/link";
import { meetingTypeLabels } from "@/app/(dashboard)/labels";

type MeetingRow = {
  id: string;
  type: string;
  date: Date;
  summary: string | null;
  dealId: string | null;
};

type Props = {
  meetings: MeetingRow[];
  dealMeetingNewPath: string | null;
};

export function InquiryMeetingSection({ meetings, dealMeetingNewPath }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">商談記録</h2>
        {dealMeetingNewPath ? (
          <Link
            href={dealMeetingNewPath}
            className="text-xs text-primary underline"
          >
            + 商談を追加
          </Link>
        ) : (
          <span className="text-xs text-text-disabled cursor-not-allowed">
            + 商談を追加
          </span>
        )}
      </div>

      {meetings.length === 0 ? (
        <p className="text-xs text-text-muted">商談記録がありません</p>
      ) : (
        <div className="space-y-1">
          {meetings.map((m) => {
            const dateStr = m.date instanceof Date
              ? m.date.toLocaleDateString("ja-JP")
              : String(m.date);
            const summary = m.summary ?? "";
            const truncatedSummary =
              summary.length > 40 ? `${summary.slice(0, 40)}...` : summary;
            const typeLabel =
              meetingTypeLabels[m.type as keyof typeof meetingTypeLabels] ?? m.type;

            const content = (
              <div className="flex gap-2 text-xs py-[10px] px-[14px] border border-border bg-bg-surface hover:bg-bg-toolbar">
                <span className="text-text-muted shrink-0">{typeLabel}</span>
                <span className="text-text-muted shrink-0">{dateStr}</span>
                <span className="text-text flex-1">{truncatedSummary || "-"}</span>
              </div>
            );

            if (m.dealId) {
              return (
                <Link
                  key={m.id}
                  href={`/deals/${m.dealId}/meetings/${m.id}`}
                  className="block"
                >
                  {content}
                </Link>
              );
            }

            return <div key={m.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
