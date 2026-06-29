import Link from "next/link";
import type { TimelineEntry } from "@/lib/activityAggregator";
import { formatRelativeTime } from "@/app/(dashboard)/dashboard/dashboardUtils";
import { getActionLabel } from "@/lib/activityLabels";

interface Props {
  activities: TimelineEntry[];
  userMap: Record<string, string>;
  targetInfoMap: Record<string, { label: string; href?: string }>;
}

export function DealActivitySection({ activities, userMap, targetInfoMap }: Props) {
  if (activities.length === 0) {
    return (
      <p className="text-xs text-text-muted">アクティビティはありません</p>
    );
  }

  return (
    <ul className="text-xs">
      {activities.map((entry) => {
        const actorName =
          userMap[entry.actorId] ?? entry.actorId.slice(0, 8);
        const actionLabel = getActionLabel(entry);
        const relativeTime = formatRelativeTime(entry.createdAt);
        const targetInfo = targetInfoMap[`${entry.targetType}:${entry.targetId}`];

        return (
          <li
            key={entry.id}
            className="flex items-center gap-2 py-1.5 border-b border-border-light last:border-0"
          >
            <span className="text-text-muted shrink-0">{relativeTime}</span>
            <span className="text-text font-medium shrink-0">{actorName}</span>
            <span className="text-text-muted">が</span>
            <span className="text-text">{actionLabel}</span>
            {entry.count > 1 && (
              <span className="text-text-muted">({entry.count}件)</span>
            )}
            {targetInfo && (
              <>
                <span className="text-text-muted">：</span>
                {targetInfo.href ? (
                  <Link href={targetInfo.href} className="text-primary underline">
                    {targetInfo.label}
                  </Link>
                ) : (
                  <span>{targetInfo.label}</span>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
