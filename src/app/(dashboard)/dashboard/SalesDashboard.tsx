"use client";

import Link from "next/link";
import { SectionCard } from "@/app/components";
import { phaseLabels } from "@/app/(dashboard)/labels";
import type { DashboardActionItem, PipelineSummaryItem } from "@/domain/models/dashboard";
import type { AuditLog } from "@/domain/models/auditLog";
import type { DealWithDetails } from "@/domain/models/deal";
import { DashboardHeader } from "./DashboardHeader";
import { formatRelativeTime } from "./dashboardUtils";

export { formatRelativeTime };

const roleLabels: Record<string, string> = {
  admin: "管理者",
  manager: "マネージャー",
  member: "営業",
  finance: "経理",
};

type Props = {
  actions: DashboardActionItem[];
  pipelineSummary: PipelineSummaryItem[];
  recentActivities: AuditLog[];
  staleDeals: DealWithDetails[] | null;
  userRole: string;
  userMap: Record<string, string>;
};

function getEntityLink(targetType: string, targetId: string): string | null {
  switch (targetType) {
    case "deal":
      return `/deals/${targetId}`;
    case "request":
      return `/requests/${targetId}`;
    case "inquiry":
      return `/inquiries/${targetId}`;
    case "contract":
      return `/contracts/${targetId}`;
    default:
      return null;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function isOverdue(item: DashboardActionItem): boolean {
  const now = Date.now();
  if (item.type === "approval") {
    return item.deadline != null && item.deadline.getTime() < now;
  }
  if (item.type === "action_item") {
    return item.dueDate != null && new Date(item.dueDate).getTime() < now;
  }
  return false;
}

function calcStaleDays(updatedAt: Date): number {
  return Math.floor((Date.now() - updatedAt.getTime()) / 86400000);
}

function getDateDisplay(item: DashboardActionItem): { text: string; date: Date | null } {
  if (item.type === "approval") {
    return { text: item.deadline ? formatDate(item.deadline) : "—", date: item.deadline };
  }
  if (item.type === "action_item") {
    const d = item.dueDate ? new Date(item.dueDate) : null;
    return { text: d ? formatDate(d) : "—", date: d };
  }
  return { text: formatDate(item.createdAt), date: item.createdAt };
}

export function SalesDashboard({
  actions,
  pipelineSummary,
  recentActivities,
  staleDeals,
  userRole,
  userMap,
}: Props) {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const subtitle = `${today} | ${roleLabels[userRole] ?? userRole}`;

  const totalCount = pipelineSummary.reduce((s, i) => s + i.count, 0);
  const totalAmount = pipelineSummary.reduce((s, i) => s + i.totalAmount, 0);

  const overdueCount = actions.filter(isOverdue).length;

  return (
    <div>
      <DashboardHeader
        title="ダッシュボード"
        subtitle={subtitle}
        actions={
          <>
            <Link
              href="/deals"
              className="border border-border text-text text-sm px-3 py-1.5 rounded hover:bg-bg-page"
            >
              案件を見る
            </Link>
            <Link
              href="/inquiries/new"
              className="bg-primary text-white text-sm px-3 py-1.5 rounded hover:opacity-90"
            >
              引合を登録
            </Link>
          </>
        }
      />

      <div className="mt-2 space-y-2">
        {/* Pipeline summary */}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
          {pipelineSummary.map((item) => (
            <SectionCard key={item.phase} className="p-3">
              <Link
                href={`/deals?phase=${item.phase}`}
                className="block hover:bg-bg-page text-center"
              >
                <div className="text-xs text-text-secondary mb-1">
                  {phaseLabels[item.phase] ?? item.phase}
                </div>
                <div className="text-2xl font-bold text-text">
                  {item.count}
                  <span className="text-xs font-normal ml-0.5">件</span>
                </div>
                <div className="text-2xs text-text-muted font-mono">
                  ¥{item.totalAmount.toLocaleString("ja-JP")}
                </div>
              </Link>
            </SectionCard>
          ))}
          {/* Total column */}
          <SectionCard className="p-3">
            <Link
              href="/deals"
              className="block hover:bg-bg-page text-center"
            >
              <div className="text-xs text-text-secondary mb-1">合計</div>
              <div className="text-2xl font-bold text-text">
                {totalCount}
                <span className="text-xs font-normal ml-0.5">件</span>
              </div>
              <div className="text-2xs text-text-muted font-mono">
                ¥{totalAmount.toLocaleString("ja-JP")}
              </div>
            </Link>
          </SectionCard>
        </div>

        {/* Main 2-column content */}
        <div className="grid grid-cols-[1.55fr_1fr] gap-6">
          {/* Left: Action items */}
          <SectionCard className="p-4">
            <h2 className="text-sm font-semibold text-text mb-2 flex items-center gap-1">
              アクション待ちリスト
              <span className="text-xs text-text-secondary font-normal ml-1">
                {actions.length}件
              </span>
              {overdueCount > 0 && (
                <span className="bg-danger text-white text-2xs rounded-full px-1.5 py-0.5 ml-1">
                  {overdueCount}
                </span>
              )}
            </h2>
            {actions.length === 0 ? (
              <p className="text-xs text-text-disabled py-2">
                アクション待ちのアイテムはありません
              </p>
            ) : (
              <div>
                {actions.map((item) => {
                  const overdue = isOverdue(item);
                  const { text: dateText } = getDateDisplay(item);
                  const itemKey =
                    item.type === "approval"
                      ? `approval-${item.requestId}`
                      : item.type === "action_item"
                        ? `action-${item.id}`
                        : `inquiry-${item.inquiryId}`;
                  return (
                    <div
                      key={itemKey}
                      className="flex items-start gap-2 border-b border-border-light py-2"
                    >
                      {/* Type label */}
                      <div className="w-[62px] shrink-0">
                        {item.type === "approval" && (
                          <span className="block text-center text-2xs bg-warning/10 text-warning rounded px-1 py-0.5">
                            承認待ち
                          </span>
                        )}
                        {item.type === "action_item" && (
                          <span className="block text-center text-2xs bg-primary/10 text-primary rounded px-1 py-0.5">
                            アクション
                          </span>
                        )}
                        {item.type === "inquiry" && (
                          <span className="block text-center text-2xs bg-success/10 text-success rounded px-1 py-0.5">
                            新規引合
                          </span>
                        )}
                      </div>

                      {/* Center: title + subtext */}
                      <div className="flex-1 min-w-0">
                        {item.type === "approval" && (
                          <>
                            <Link
                              href={`/requests/${item.requestId}`}
                              className="text-primary underline text-xs truncate block"
                            >
                              {item.requestTitle}
                            </Link>
                            <p className="text-xs text-text-muted truncate">
                              {item.approverRole}
                            </p>
                          </>
                        )}
                        {item.type === "action_item" && (
                          <>
                            {item.dealId ? (
                              <Link
                                href={`/deals/${item.dealId}`}
                                className="text-primary underline text-xs truncate block"
                              >
                                {item.dealTitle || item.dealId}
                              </Link>
                            ) : (
                              <p className="text-xs text-text truncate">
                                {item.description}
                              </p>
                            )}
                            <p className="text-xs text-text-muted truncate">
                              {item.assigneeId
                                ? (userMap[item.assigneeId] ?? item.assigneeId)
                                : "未設定"}
                            </p>
                          </>
                        )}
                        {item.type === "inquiry" && (
                          <Link
                            href={`/inquiries/${item.inquiryId}`}
                            className="text-primary underline text-xs truncate block"
                          >
                            {item.inquiryTitle}
                          </Link>
                        )}
                      </div>

                      {/* Right: date */}
                      <div className="shrink-0 text-right">
                        {overdue ? (
                          <div>
                            <span className="text-xs text-danger font-bold">{dateText}</span>
                            <span className="ml-1 text-2xs bg-danger text-white rounded px-1 py-0.5">
                              超過
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary">{dateText}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Right: Stale deals + Recent activities */}
          <div className="space-y-2">
            {/* Stale deals (manager/admin only) */}
            {staleDeals !== null && (
              <SectionCard className="p-4">
                <h2 className="text-sm font-semibold text-text mb-2">
                  停滞案件リスト
                </h2>
                {staleDeals.length === 0 ? (
                  <p className="text-xs text-text-disabled py-2">
                    停滞している案件はありません
                  </p>
                ) : (
                  <div>
                    {staleDeals.map((deal) => {
                      const staleDays = calcStaleDays(deal.updatedAt);
                      const subParts: string[] = [
                        phaseLabels[deal.phase] ?? deal.phase,
                      ];
                      if (deal.estimatedAmount != null) {
                        subParts.push(`¥${deal.estimatedAmount.toLocaleString("ja-JP")}`);
                      }
                      if (deal.assigneeName != null) {
                        subParts.push(deal.assigneeName);
                      }
                      return (
                        <div
                          key={deal.id}
                          className="border-b border-border-light py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/deals/${deal.id}`}
                              className="text-primary underline text-xs truncate"
                            >
                              {deal.title}
                            </Link>
                            <span className="text-xs text-danger font-bold shrink-0">
                              {staleDays}日停滞
                            </span>
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            {subParts.join(" · ")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            )}

            {/* Recent activities */}
            <SectionCard className="p-4">
              <h2 className="text-sm font-semibold text-text mb-2">
                直近の活動
              </h2>
              {recentActivities.length === 0 ? (
                <p className="text-xs text-text-disabled py-2">
                  活動ログがありません
                </p>
              ) : (
                <div>
                  {recentActivities.map((log) => {
                    const link = getEntityLink(log.targetType, log.targetId);
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 border-b border-border-light py-1.5"
                      >
                        {/* Actor */}
                        <div className="w-[46px] shrink-0 text-xs text-text-secondary truncate">
                          {userMap[log.actorId] ?? log.actorId.slice(0, 8)}
                        </div>
                        {/* Action + target */}
                        <div className="flex-1 min-w-0 text-xs">
                          <span>{log.action} </span>
                          {link ? (
                            <Link href={link} className="text-primary underline">
                              {log.targetType}/{log.targetId.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="text-text-secondary">
                              {log.targetType}/{log.targetId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        {/* Relative time */}
                        <div className="shrink-0 text-xs text-text-muted">
                          {formatRelativeTime(log.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
