import * as interactionRepository from "@/infrastructure/repositories/interactionRepository";
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
    interactionRepository.findAllByDeal(dealId, organizationId),
    contractRepository.findAllByDealId(dealId, organizationId),
  ]);

  // 請求は案件に直接紐づかず契約経由（invoice.contractId）のため、契約解決後にまとめて取得する。
  const invoices = (
    await Promise.all(
      contracts.map((c) => invoiceRepository.findAllByContract(c.id, organizationId))
    )
  ).flat();

  // 契約・請求に紐づく顧客接点（contract_adjustment / invoice_adjustment）を並列取得する。
  const [contractInteractions, invoiceInteractions] = await Promise.all([
    Promise.all(
      contracts.map((c) => interactionRepository.findAllByContract(c.id, organizationId))
    ).then((results) => results.flat()),
    Promise.all(
      invoices.map((inv) => interactionRepository.findAllByInvoice(inv.id, organizationId))
    ).then((results) => results.flat()),
  ]);

  const targets: Array<{ targetType: string; targetId: string }> = [
    { targetType: "deal", targetId: dealId },
    // 新規ログ（interaction.*）と旧ログ（meeting.*）の両方を対象とする
    ...meetings.flatMap((m) => [
      { targetType: "interaction", targetId: m.id },
      { targetType: "meeting", targetId: m.id },
    ]),
    ...contracts.map((c) => ({ targetType: "contract", targetId: c.id })),
    ...invoices.map((inv) => ({ targetType: "invoice", targetId: inv.id })),
    // 契約・請求経由の顧客接点をタイムライン対象に追加する
    ...contractInteractions.map((i) => ({ targetType: "interaction", targetId: i.id })),
    ...invoiceInteractions.map((i) => ({ targetType: "interaction", targetId: i.id })),
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
  // interaction と meeting の両キーを登録し、新旧両方のログに対応する
  const meetingEntries = meetings.flatMap((m) => {
    const typeLabel = m.meetingType ? meetingTypeLabels[m.meetingType] : "";
    const label = `${typeLabel} ${m.date.toLocaleDateString("ja-JP")}`.trim();
    const href = `/deals/${dealId}/meetings/${m.id}`;
    const info: TargetInfo = { label, href };
    return [
      [`interaction:${m.id}`, info],
      [`meeting:${m.id}`, info],
    ] as [string, TargetInfo][];
  });

  const targetInfoMap: Record<string, TargetInfo> = {
    [`deal:${dealId}`]: { label: dealTitle, href: `/deals/${dealId}` },
    ...Object.fromEntries(meetingEntries),
    ...Object.fromEntries(
      contracts.map((c) => [
        `contract:${c.id}`,
        { label: c.title, href: `/contracts/${c.id}` },
      ])
    ),
    ...Object.fromEntries(
      invoices.map((inv) => [
        `invoice:${inv.id}`,
        { label: inv.title, href: `/contracts/${inv.contractId}/invoices/${inv.id}` },
      ])
    ),
    // 契約調整の顧客接点
    ...Object.fromEntries(
      contractInteractions.map((i) => [
        `interaction:${i.id}`,
        {
          label: `契約調整 ${i.date.toLocaleDateString("ja-JP")}`,
          href: `/contracts/${i.contractId}`,
        } as TargetInfo,
      ])
    ),
    // 請求調整の顧客接点（invoiceId から contractId を逆引き）
    ...Object.fromEntries(
      invoiceInteractions.map((i) => {
        const relatedInvoice = invoices.find((inv) => inv.id === i.invoiceId);
        return [
          `interaction:${i.id}`,
          {
            label: `請求調整 ${i.date.toLocaleDateString("ja-JP")}`,
            href: relatedInvoice
              ? `/contracts/${relatedInvoice.contractId}/invoices/${i.invoiceId}`
              : `/contracts`,
          } as TargetInfo,
        ];
      })
    ),
  };

  return { logs, targetInfoMap };
}
