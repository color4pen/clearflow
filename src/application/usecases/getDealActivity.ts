import * as meetingRepository from "@/infrastructure/repositories/meetingRepository";
import * as contractRepository from "@/infrastructure/repositories/contractRepository";
import * as invoiceRepository from "@/infrastructure/repositories/invoiceRepository";
import * as actionItemRepository from "@/infrastructure/repositories/actionItemRepository";
import * as dealContactRepository from "@/infrastructure/repositories/dealContactRepository";
import * as auditLogRepository from "@/infrastructure/repositories/auditLogRepository";
import { ACTIVITY_TIMELINE_LIMIT, getHiddenActions } from "@/lib/activityConfig";
import { meetingTypeLabels } from "@/lib/meetingLabels";
import type { AuditLog } from "@/domain/models/auditLog";

export type TargetInfo = {
  label: string;
  href?: string;
};

export type DealActivityResult = {
  logs: AuditLog[];
  targetInfoMap: Record<string, TargetInfo>;
};

export async function getDealActivity(params: {
  dealId: string;
  organizationId: string;
  dealTitle: string;
}): Promise<DealActivityResult> {
  const { dealId, organizationId, dealTitle } = params;

  const [meetings, contracts, actionItems, dealContacts] = await Promise.all([
    meetingRepository.findAllByDeal(dealId, organizationId),
    contractRepository.findAllByDealId(dealId, organizationId),
    actionItemRepository.findByDeal(dealId, organizationId),
    dealContactRepository.findByDeal(dealId, organizationId),
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
    ...actionItems.map((ai) => ({ targetType: "action_item", targetId: ai.id })),
    ...dealContacts.map((dc) => ({ targetType: "deal_contact", targetId: dc.id })),
  ];

  const excludeActions = getHiddenActions();

  const result = await auditLogRepository.findByTargets(organizationId, targets, {
    limit: ACTIVITY_TIMELINE_LIMIT,
    ...(excludeActions.length > 0 ? { excludeActions } : {}),
  });

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
    ...Object.fromEntries(
      actionItems.map((ai) => [
        `action_item:${ai.id}`,
        { label: ai.description },
      ])
    ),
    // deal_contact はマップに含めない（contactId → 氏名の追加解決をしないため）
  };

  return { logs: result, targetInfoMap };
}
