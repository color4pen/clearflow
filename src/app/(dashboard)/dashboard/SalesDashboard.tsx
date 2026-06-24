import Link from "next/link";
import type { ActionableItem, PipelineSummaryItem } from "@/domain/services/dashboardService";
import type { AuditLog } from "@/domain/models/auditLog";
import type { DealWithDetails } from "@/domain/models/deal";
import { SECTION_CARD, TOOLBAR } from "../styles";

function getEntityLink(targetType: string, targetId: string): string {
  switch (targetType) {
    case "deal":
      return `/deals/${targetId}`;
    case "request":
      return `/requests/${targetId}`;
    case "contract":
      return `/contracts/${targetId}`;
    case "inquiry":
      return `/inquiries`;
    case "client":
      return `/clients/${targetId}`;
    default:
      return "#";
  }
}

function actionItemTypeLabel(type: ActionableItem["type"]): string {
  switch (type) {
    case "approval":
      return "承認";
    case "action_item":
      return "アクション";
    case "inquiry":
      return "引合";
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

type Props = {
  actionItems: ActionableItem[];
  pipelineSummary: PipelineSummaryItem[];
  recentLogs: AuditLog[];
  staleDeals: DealWithDetails[] | null;
  userRole: string;
};

export function SalesDashboard({ actionItems, pipelineSummary, recentLogs, staleDeals }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* アクション待ちリスト */}
      <section>
        <div className={`${TOOLBAR} mb-0`}>
          <span className="text-sm font-bold text-[#333333]">アクション待ち</span>
          <span className="text-xs text-text-secondary ml-2">{actionItems.length} 件</span>
        </div>
        <div className={`${SECTION_CARD} border-t-0`}>
          {actionItems.length === 0 ? (
            <p className="text-xs text-text-disabled py-4 text-center">アクション待ちはありません</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left px-2 py-1 text-text-secondary font-normal w-16">種別</th>
                  <th className="text-left px-2 py-1 text-text-secondary font-normal">件名</th>
                  <th className="text-left px-2 py-1 text-text-secondary font-normal w-24">担当者</th>
                  <th className="text-right px-2 py-1 text-text-secondary font-normal w-20">期日</th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item, i) => (
                  <tr key={i} className="border-b border-border-light last:border-0 hover:bg-bg-toolbar">
                    <td className="px-2 py-1 text-text-secondary">{actionItemTypeLabel(item.type)}</td>
                    <td className="px-2 py-1">
                      <Link href={item.linkHref} className="text-primary underline">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-2 py-1 text-text-secondary">{item.meta.assignee ?? ""}</td>
                    <td className="px-2 py-1 text-right text-text-secondary">
                      {item.dueDate ? formatDate(item.dueDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* パイプラインサマリ */}
      <section>
        <div className={`${TOOLBAR} mb-0`}>
          <span className="text-sm font-bold text-[#333333]">パイプライン</span>
        </div>
        <div className={`${SECTION_CARD} border-t-0`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left px-2 py-1 text-text-secondary font-normal">フェーズ</th>
                <th className="text-right px-2 py-1 text-text-secondary font-normal w-16">件数</th>
                <th className="text-right px-2 py-1 text-text-secondary font-normal w-32">想定金額</th>
              </tr>
            </thead>
            <tbody>
              {pipelineSummary.map((item) => (
                <tr key={item.phase} className="border-b border-border-light last:border-0 hover:bg-bg-toolbar">
                  <td className="px-2 py-1">
                    <Link href={`/deals?phase=${item.phase}`} className="text-primary underline">
                      {item.label}
                    </Link>
                  </td>
                  <td className="px-2 py-1 text-right">{item.count}</td>
                  <td className="px-2 py-1 text-right">
                    {item.totalAmount > 0
                      ? `¥${item.totalAmount.toLocaleString("ja-JP")}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 直近の活動 */}
      <section>
        <div className={`${TOOLBAR} mb-0`}>
          <span className="text-sm font-bold text-[#333333]">直近の活動</span>
        </div>
        <div className={`${SECTION_CARD} border-t-0`}>
          {recentLogs.length === 0 ? (
            <p className="text-xs text-text-disabled py-4 text-center">活動履歴はありません</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border-light last:border-0 hover:bg-bg-toolbar">
                    <td className="px-2 py-1 text-text-secondary w-36">
                      {log.createdAt.toLocaleDateString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-2 py-1">
                      <Link href={getEntityLink(log.targetType, log.targetId)} className="text-primary underline">
                        {log.action}
                      </Link>
                    </td>
                    <td className="px-2 py-1 text-text-secondary">{log.targetType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 停滞案件（manager/admin のみ） */}
      {staleDeals !== null && (
        <section>
          <div className={`${TOOLBAR} mb-0`}>
            <span className="text-sm font-bold text-[#333333]">停滞案件</span>
            <span className="text-xs text-text-secondary ml-2">{staleDeals.length} 件</span>
          </div>
          <div className={`${SECTION_CARD} border-t-0`}>
            {staleDeals.length === 0 ? (
              <p className="text-xs text-text-disabled py-4 text-center">停滞案件はありません</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left px-2 py-1 text-text-secondary font-normal">案件名</th>
                    <th className="text-left px-2 py-1 text-text-secondary font-normal w-20">フェーズ</th>
                    <th className="text-left px-2 py-1 text-text-secondary font-normal w-32">顧客</th>
                    <th className="text-right px-2 py-1 text-text-secondary font-normal w-28">最終更新</th>
                  </tr>
                </thead>
                <tbody>
                  {staleDeals.map((deal) => (
                    <tr key={deal.id} className="border-b border-border-light last:border-0 hover:bg-bg-toolbar">
                      <td className="px-2 py-1">
                        <Link href={`/deals/${deal.id}`} className="text-primary underline">
                          {deal.title}
                        </Link>
                      </td>
                      <td className="px-2 py-1 text-text-secondary">{deal.phase}</td>
                      <td className="px-2 py-1 text-text-secondary">{deal.clientName}</td>
                      <td className="px-2 py-1 text-right text-text-secondary">
                        {deal.updatedAt.toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
