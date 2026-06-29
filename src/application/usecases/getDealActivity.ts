import * as meetingRepository from "@/infrastructure/repositories/meetingRepository";
import * as contractRepository from "@/infrastructure/repositories/contractRepository";
import * as invoiceRepository from "@/infrastructure/repositories/invoiceRepository";
import * as auditLogRepository from "@/infrastructure/repositories/auditLogRepository";
import {
  ACTIVITY_TIMELINE_LIMIT,
  TIMELINE_ACTIONS,
  getHiddenActions,
} from "@/lib/activityConfig";
import { aggregateTimeline } from "@/lib/activityAggregator";
import { meetingTypeLabels } from "@/lib/meetingLabels";
import type { TimelineEntry } from "@/lib/activityAggregator";

export type { TimelineEntry };

export type TargetInfo = {
  label: string;
  href?: string;
};

export type DealActivityResult = {
  logs: TimelineEntry[];
  targetInfoMap: Record<string, TargetInfo>;
};

export async function getDealActivity(params: {
  dealId: string;
  organizationId: string;
  dealTitle: string;
}): Promise<DealActivityResult> {
  const { dealId, organizationId, dealTitle } = params;

  const [meetings, contracts] = await Promise.all([
    meetingRepository.findAllByDeal(dealId, organizationId),
    contractRepository.findAllByDealId(dealId, organizationId),
  ]);

  // 請求は案件に直接紐づかず契約経由（invoice.contractId）のため、契約解決後にまとめて取得する。
  const invoices = (
    await Promise.all(
      contracts.map((c) => invoiceRepository.findAllByContract(c.id, organizationId))
    )
  ).flat();

  const targets: Array<{ targetType: string; targetId: string }> = [
    { targetType: "deal", targetId: dealId },
    ...meetings.map((m) => ({ targetType: "meeting", targetId: m.id })),
    ...contracts.map((c) => ({ targetType: "contract", targetId: c.id })),
    ...invoices.map((inv) => ({ targetType: "invoice", targetId: inv.id })),
  ];

  // DB レベルで表示対象アクションのみ取得する（limit は渡さない）
  const allLogs = await auditLogRepository.findByTargets(organizationId, targets, {
    includeActions: TIMELINE_ACTIONS,
  });

  // 環境変数による追加除外をアプリケーション層で適用する（集約前）
  const hiddenActions = getHiddenActions();
  const filteredLogs =
    hiddenActions.length > 0
      ? allLogs.filter((log) => !hiddenActions.includes(log.action))
      : allLogs;

  // 集約してから件数上限を適用する
  const aggregated = aggregateTimeline(filteredLogs);
  const logs = aggregated.slice(0, ACTIVITY_TIMELINE_LIMIT);

  // 既に取得済みのエンティティから targetInfoMap を構築する（新規リポジトリ取得なし）
  const targetInfoMap: Record<string, TargetInfo> = {
    [`deal:${dealId}`]: { label: dealTitle, href: `/deals/${dealId}` },
    ...Object.fromEntries(
      meetings.map((m) => [
        `meeting:${m.id}`,
        {
          label: `${meetingTypeLabels[m.type] ?? m.type} ${m.date.toLocaleDateString("ja-JP")}`,
          href: `/deals/${dealId}/meetings/${m.id}`,
        },
      ])
    ),
    ...Object.fromEntries(
      contracts.map((c) => [
        `contract:${c.id}`,
        { label: c.title, href: `/contracts/${c.id}` },
      ])
    ),
    ...Object.fromEntries(
      invoices.map((inv) => [
        `invoice:${inv.id}`,
        { label: inv.title },
      ])
    ),
  };

  return { logs, targetInfoMap };
}
