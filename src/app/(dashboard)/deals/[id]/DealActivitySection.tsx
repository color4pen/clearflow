import Link from "next/link";
import type { AuditLog } from "@/domain/models/auditLog";
import { formatRelativeTime } from "@/app/(dashboard)/dashboard/dashboardUtils";
import { getActionLabel } from "@/lib/activityLabels";

interface Props {
  activities: AuditLog[];
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
      {activities.map((log) => {
        const actorName =
          userMap[log.actorId] ?? log.actorId.slice(0, 8);
        const actionLabel = getActionLabel(log);
        const relativeTime = formatRelativeTime(log.createdAt);
        const targetInfo = targetInfoMap[`${log.targetType}:${log.targetId}`];

        return (
          <li
            key={log.id}
            className="flex items-center gap-2 py-1.5 border-b border-border-light last:border-0"
          >
            <span className="text-text-muted shrink-0">{relativeTime}</span>
            <span className="text-text font-medium shrink-0">{actorName}</span>
            <span className="text-text-muted">が</span>
            <span className="text-text">{actionLabel}</span>
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
