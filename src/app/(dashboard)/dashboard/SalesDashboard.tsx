"use client";

import Link from "next/link";
import { PageToolbar, SectionCard } from "@/app/components";
import { phaseLabels } from "@/app/(dashboard)/labels";
import type { DashboardActionItem, PipelineSummaryItem } from "@/domain/models/dashboard";
import type { AuditLog } from "@/domain/models/auditLog";
import type { DealWithDetails } from "@/domain/models/deal";

type Props = {
  actions: DashboardActionItem[];
  pipelineSummary: PipelineSummaryItem[];
  recentActivities: AuditLog[];
  staleDeals: DealWithDetails[] | null;
};

const actionTypeLabel: Record<DashboardActionItem["type"], string> = {
  approval: "承認",
  action_item: "TODO",
  inquiry: "引合",
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

export function SalesDashboard({
  actions,
  pipelineSummary,
  recentActivities,
  staleDeals,
}: Props) {
  return (
    <div>
      <PageToolbar title="ダッシュボード" />

      <div className="mt-2 space-y-2">
        {/* Action items */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            アクション待ちリスト
          </h2>
          {actions.length === 0 ? (
            <p className="text-xs text-text-disabled py-2">
              アクション待ちのアイテムはありません
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-text-muted">
                  <th className="py-1 pr-2 w-16">種別</th>
                  <th className="py-1 pr-2">タイトル / 説明</th>
                  <th className="py-1 pr-2">担当者</th>
                  <th className="py-1 text-right w-28">期日</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-bg-page">
                    <td className="py-1 pr-2">
                      <span className="text-xs text-text-muted">
                        [{actionTypeLabel[item.type]}]
                      </span>
                    </td>
                    <td className="py-1 pr-2">
                      {item.type === "approval" && (
                        <Link
                          href={`/requests/${item.requestId}`}
                          className="text-primary underline"
                        >
                          {item.requestTitle}
                        </Link>
                      )}
                      {item.type === "action_item" && (
                        <span>
                          <Link
                            href={`/deals/${item.dealId}`}
                            className="text-primary underline mr-1"
                          >
                            {item.dealTitle || item.dealId}
                          </Link>
                          <span className="text-text-secondary text-xs">
                            {item.description}
                          </span>
                        </span>
                      )}
                      {item.type === "inquiry" && (
                        <Link
                          href={`/inquiries/${item.inquiryId}`}
                          className="text-primary underline"
                        >
                          {item.inquiryTitle}
                        </Link>
                      )}
                    </td>
                    <td className="py-1 pr-2 text-xs text-text-secondary">
                      {item.type === "action_item" ? item.assignee : "—"}
                    </td>
                    <td className="py-1 text-right text-xs text-text-secondary">
                      {item.type === "approval" &&
                        (item.deadline ? formatDate(item.deadline) : "—")}
                      {item.type === "action_item" &&
                        (item.dueDate
                          ? formatDate(new Date(item.dueDate))
                          : "—")}
                      {item.type === "inquiry" && formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Pipeline summary */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            パイプラインサマリ
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {pipelineSummary.map((item) => (
              <Link
                key={item.phase}
                href={`/deals?phase=${item.phase}`}
                className="block border border-border p-2 hover:bg-bg-page text-center"
              >
                <div className="text-xs text-text-muted mb-1">
                  {phaseLabels[item.phase] ?? item.phase}
                </div>
                <div className="text-lg font-bold text-text">{item.count}</div>
                <div className="text-xs text-text-secondary">
                  ¥{item.totalAmount.toLocaleString("ja-JP")}
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        {/* Recent activities */}
        <SectionCard className="p-4">
          <h2 className="text-sm font-semibold text-text-muted mb-2">
            直近の活動
          </h2>
          {recentActivities.length === 0 ? (
            <p className="text-xs text-text-disabled py-2">
              活動ログがありません
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-text-muted">
                  <th className="py-1 pr-2">アクション</th>
                  <th className="py-1 pr-2">対象</th>
                  <th className="py-1 text-right w-36">日時</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((log) => {
                  const link = getEntityLink(log.targetType, log.targetId);
                  return (
                    <tr key={log.id} className="border-b hover:bg-bg-page">
                      <td className="py-1 pr-2 text-xs">{log.action}</td>
                      <td className="py-1 pr-2 text-xs">
                        {link ? (
                          <Link href={link} className="text-primary underline">
                            {log.targetType}/{log.targetId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-text-secondary">
                            {log.targetType}/{log.targetId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="py-1 text-right text-xs text-text-secondary">
                        {log.createdAt.toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Stale deals (manager/admin only) */}
        {staleDeals !== null && (
          <SectionCard className="p-4">
            <h2 className="text-sm font-semibold text-text-muted mb-2">
              停滞案件リスト
            </h2>
            {staleDeals.length === 0 ? (
              <p className="text-xs text-text-disabled py-2">
                停滞している案件はありません
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-text-muted">
                    <th className="py-1 pr-2">案件名</th>
                    <th className="py-1 pr-2 w-20">フェーズ</th>
                    <th className="py-1 text-right w-28">最終更新</th>
                  </tr>
                </thead>
                <tbody>
                  {staleDeals.map((deal) => (
                    <tr key={deal.id} className="border-b hover:bg-bg-page">
                      <td className="py-1 pr-2">
                        <Link
                          href={`/deals/${deal.id}`}
                          className="text-primary underline"
                        >
                          {deal.title}
                        </Link>
                      </td>
                      <td className="py-1 pr-2 text-xs text-text-secondary">
                        {phaseLabels[deal.phase] ?? deal.phase}
                      </td>
                      <td className="py-1 text-right text-xs text-text-secondary">
                        {formatDate(deal.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        )}
      </div>
    </div>
  );
}
