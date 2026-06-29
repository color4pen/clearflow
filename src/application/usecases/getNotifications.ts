import * as watchRepository from "@/infrastructure/repositories/watchRepository";
import * as dealRepository from "@/infrastructure/repositories/dealRepository";
import * as interactionRepository from "@/infrastructure/repositories/interactionRepository";
import * as contractRepository from "@/infrastructure/repositories/contractRepository";
import * as invoiceRepository from "@/infrastructure/repositories/invoiceRepository";
import * as actionItemRepository from "@/infrastructure/repositories/actionItemRepository";
import * as dealContactRepository from "@/infrastructure/repositories/dealContactRepository";
import * as auditLogRepository from "@/infrastructure/repositories/auditLogRepository";
import { NOTIFICATION_ACTIONS } from "@/domain/models/notification";
import { meetingTypeLabels } from "@/lib/meetingLabels";
import type { GetNotificationsResult, TargetInfo } from "@/domain/models/notification";

export type { TargetInfo };

export async function getNotifications(params: {
  userId: string;
  organizationId: string;
  notificationsLastSeenAt: Date | null;
}): Promise<GetNotificationsResult> {
  const { userId, organizationId, notificationsLastSeenAt } = params;

  // 1. ログインユーザーの watch 一覧を取得
  const userWatches = await watchRepository.findByUser(userId, organizationId);

  if (userWatches.length === 0) {
    return { notifications: [], unreadCount: 0 };
  }

  // 2. 各 watch 対象の案件について配下エンティティを並列取得
  const dealDataList = await Promise.all(
    userWatches.map(async (watch) => {
      const deal = await dealRepository.findById(watch.dealId, organizationId);
      if (!deal) return null;

      const [meetings, contracts, actionItems, dealContacts] = await Promise.all([
        interactionRepository.findAllByDeal(watch.dealId, organizationId),
        contractRepository.findAllByDealId(watch.dealId, organizationId),
        actionItemRepository.findByDeal(watch.dealId, organizationId),
        dealContactRepository.findByDeal(watch.dealId, organizationId),
      ]);

      const invoices = (
        await Promise.all(
          contracts.map((c) => invoiceRepository.findAllByContract(c.id, organizationId))
        )
      ).flat();

      const targets: Array<{ targetType: string; targetId: string }> = [
        { targetType: "deal", targetId: watch.dealId },
        // 新規ログ（interaction.*）と旧ログ（meeting.*）の両方を対象とする
        ...meetings.flatMap((m) => [
          { targetType: "interaction", targetId: m.id },
          { targetType: "meeting", targetId: m.id },
        ]),
        ...contracts.map((c) => ({ targetType: "contract", targetId: c.id })),
        ...invoices.map((inv) => ({ targetType: "invoice", targetId: inv.id })),
        ...actionItems.map((ai) => ({ targetType: "action_item", targetId: ai.id })),
        ...dealContacts.map((dc) => ({ targetType: "deal_contact", targetId: dc.id })),
      ];

      // interaction と meeting の両キーを登録し、新旧両方のログに対応する
      const meetingEntries = meetings.flatMap((m) => {
        const typeLabel = m.meetingType ? meetingTypeLabels[m.meetingType] : "";
        const label = `${typeLabel} ${m.date.toLocaleDateString("ja-JP")}`.trim();
        const href = `/deals/${watch.dealId}/meetings/${m.id}`;
        const info: TargetInfo = { label, href };
        return [
          [`interaction:${m.id}`, info],
          [`meeting:${m.id}`, info],
        ] as [string, TargetInfo][];
      });

      const targetInfoMap: Record<string, TargetInfo> = {
        [`deal:${watch.dealId}`]: { label: deal.title, href: `/deals/${watch.dealId}` },
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
            { label: inv.title },
          ])
        ),
        ...Object.fromEntries(
          actionItems.map((ai) => [
            `action_item:${ai.id}`,
            { label: ai.description },
          ])
        ),
      };

      return { watch, deal, targets, targetInfoMap };
    })
  );

  const validDealData = dealDataList.filter(
    (d): d is NonNullable<typeof d> => d !== null
  );

  if (validDealData.length === 0) {
    return { notifications: [], unreadCount: 0 };
  }

  // 3. 全 watch 分の targets をまとめて findByTargets に渡す
  // afterDate には全 watch の中で最も古い created_at を使う（DB 側の粗いフィルタ）
  const earliestWatchDate = validDealData.reduce<Date>((earliest, { watch }) => {
    return watch.createdAt < earliest ? watch.createdAt : earliest;
  }, validDealData[0].watch.createdAt);

  const allTargets = validDealData.flatMap(({ targets }) => targets);

  const logs = await auditLogRepository.findByTargets(
    organizationId,
    allTargets,
    {
      includeActions: [...NOTIFICATION_ACTIONS],
      excludeActorId: userId,
      afterDate: earliestWatchDate,
    }
  );

  // 4. 結果をフィルタ: 各ログが対応する watch の created_at 以降であることを確認
  // targetId → dealId / watchCreatedAt のマップを構築
  const targetToDealInfo = new Map<string, { dealId: string; dealTitle: string; watchCreatedAt: Date; targetInfoMap: Record<string, TargetInfo> }>();
  for (const { watch, deal, targets, targetInfoMap } of validDealData) {
    for (const target of targets) {
      const key = `${target.targetType}:${target.targetId}`;
      targetToDealInfo.set(key, {
        dealId: watch.dealId,
        dealTitle: deal.title,
        watchCreatedAt: watch.createdAt,
        targetInfoMap,
      });
    }
  }

  // 5. 通知リストを構築する
  const notifications = logs
    .filter((log) => {
      const key = `${log.targetType}:${log.targetId}`;
      const info = targetToDealInfo.get(key);
      if (!info) return false;
      // 各 watch の created_at 以降のログのみ
      return log.createdAt >= info.watchCreatedAt;
    })
    .map((log) => {
      const key = `${log.targetType}:${log.targetId}`;
      const info = targetToDealInfo.get(key)!;
      const targetInfo = info.targetInfoMap[key] ?? null;

      // 6. 未読判定
      const isUnread = notificationsLastSeenAt === null
        ? true
        : log.createdAt > notificationsLastSeenAt;

      return {
        log,
        dealId: info.dealId,
        dealTitle: info.dealTitle,
        targetInfo,
        isUnread,
      };
    });

  // 7. 未読数を計算
  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return { notifications, unreadCount };
}
