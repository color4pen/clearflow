/**
 * getNotifications usecase の静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("getNotifications usecase 静的検証", () => {
  it("watchRepository.findByUser の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("watchRepository.findByUser");
  });

  it("auditLogRepository.findByTargets の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("auditLogRepository.findByTargets");
  });

  it("NOTIFICATION_ACTIONS の参照が含まれる（通知対象アクションフィルタ）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("NOTIFICATION_ACTIONS");
  });

  it("includeActions オプションが含まれる（対象アクションのみに限定）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("includeActions");
  });

  it("excludeActorId オプションが含まれる（本人除外）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("excludeActorId");
  });

  it("afterDate オプションが含まれる（watch 開始前除外）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("afterDate");
  });

  it("watchCreatedAt でのフィルタが含まれる（watch 開始後のみ）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("watchCreatedAt");
  });

  it("notificationsLastSeenAt による未読判定が含まれる", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("notificationsLastSeenAt");
  });

  it("isUnread の計算が含まれる", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("isUnread");
  });

  it("unreadCount の計算が含まれる", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("unreadCount");
  });

  it("targetInfoMap を構築している", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("targetInfoMap");
  });

  it("organizationId が全クエリに渡されている", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    // organizationId が複数箇所で使われていることを確認
    const matches = content.match(/organizationId/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it("notifications テーブルへの参照が含まれない（派生方式）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).not.toContain('notifications"');
    expect(content).not.toContain("notificationRepository");
  });

  it("meetingRepository.findAllByDeal の呼び出しが含まれる（配下エンティティの列挙）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("meetingRepository.findAllByDeal");
  });

  it("contractRepository.findAllByDealId の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("contractRepository.findAllByDealId");
  });

  it("actionItemRepository.findByDeal の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("actionItemRepository.findByDeal");
  });

  it("Promise.all が含まれる（並列取得）", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("Promise.all");
  });

  it("GetNotificationsResult 型を使用している", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("GetNotificationsResult");
  });
});

describe("notification ドメインモデル静的検証", () => {
  it("NOTIFICATION_ACTIONS が定義されている", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("NOTIFICATION_ACTIONS");
  });

  it("deal.update が NOTIFICATION_ACTIONS に含まれる", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("deal.update");
  });

  it("deal.updatePhase が NOTIFICATION_ACTIONS に含まれる", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("deal.updatePhase");
  });

  it("meeting.create が NOTIFICATION_ACTIONS に含まれる", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("meeting.create");
  });

  it("action_item.create が NOTIFICATION_ACTIONS に含まれる", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("action_item.create");
  });

  it("contract.create が NOTIFICATION_ACTIONS に含まれる", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("contract.create");
  });

  it("DerivedNotification 型が定義されている", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("DerivedNotification");
  });

  it("GetNotificationsResult 型が定義されている", async () => {
    const content = await readSrc("domain/models/notification.ts");
    expect(content).toContain("GetNotificationsResult");
  });
});

describe("markNotificationsAsRead usecase 静的検証", () => {
  it("userRepository.updateNotificationsLastSeenAt の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/markNotificationsAsRead.ts");
    expect(content).toContain("updateNotificationsLastSeenAt");
  });

  it("new Date() で現在時刻を使用する", async () => {
    const content = await readSrc("application/usecases/markNotificationsAsRead.ts");
    expect(content).toContain("new Date()");
  });

  it("organizationId が含まれる", async () => {
    const content = await readSrc("application/usecases/markNotificationsAsRead.ts");
    expect(content).toContain("organizationId");
  });
});

describe("markNotificationsAsRead action 静的検証", () => {
  it("markNotificationsAsReadAction が notifications.ts に含まれる", async () => {
    const content = await readSrc("app/actions/notifications.ts");
    expect(content).toContain("markNotificationsAsReadAction");
  });

  it("認証チェックが含まれる", async () => {
    const content = await readSrc("app/actions/notifications.ts");
    expect(content).toContain("auth()");
    expect(content).toContain("session");
  });

  it("revalidatePath が含まれる", async () => {
    const content = await readSrc("app/actions/notifications.ts");
    expect(content).toContain("revalidatePath");
  });

  it("organizationId をセッションから取得する", async () => {
    const content = await readSrc("app/actions/notifications.ts");
    expect(content).toContain("session.user.organizationId");
  });
});

describe("userRepository notifications_last_seen_at 静的検証", () => {
  it("updateNotificationsLastSeenAt 関数が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/userRepository.ts");
    expect(content).toContain("updateNotificationsLastSeenAt");
  });

  it("notificationsLastSeenAt が findById の select に含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/userRepository.ts");
    expect(content).toContain("notificationsLastSeenAt: users.notificationsLastSeenAt");
  });

  it("updateNotificationsLastSeenAt に organizationId 条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/userRepository.ts");
    const funcIdx = content.indexOf("updateNotificationsLastSeenAt");
    const funcBody = content.slice(funcIdx, funcIdx + 400);
    expect(funcBody).toContain("organizationId");
  });
});

describe("auditLogRepository.findByTargets 拡張 静的検証", () => {
  it("afterDate オプションが含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(content).toContain("afterDate");
  });

  it("excludeActorId オプションが含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(content).toContain("excludeActorId");
  });

  it("includeActions オプションが含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(content).toContain("includeActions");
  });

  it("gte が afterDate に使われている", async () => {
    const content = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(content).toContain("gte(auditLogs.createdAt");
  });

  it("ne が excludeActorId に使われている", async () => {
    const content = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(content).toContain("ne(auditLogs.actorId");
  });

  it("inArray が includeActions に使われている", async () => {
    const content = await readSrc("infrastructure/repositories/auditLogRepository.ts");
    expect(content).toContain("inArray(auditLogs.action");
  });
});

describe("通知 UI 静的検証", () => {
  it("NotificationBell コンポーネントが存在する", async () => {
    const content = await readSrc("app/(dashboard)/NotificationBell.tsx");
    expect(content).toContain("NotificationBell");
  });

  it("NotificationPanel コンポーネントが存在する", async () => {
    const content = await readSrc("app/(dashboard)/NotificationPanel.tsx");
    expect(content).toContain("NotificationPanel");
  });

  it("NotificationBell が getNotifications を呼び出す", async () => {
    const content = await readSrc("app/(dashboard)/NotificationBell.tsx");
    expect(content).toContain("getNotifications");
  });

  it("NotificationPanel に既読にするボタンが含まれる", async () => {
    const content = await readSrc("app/(dashboard)/NotificationPanel.tsx");
    expect(content).toContain("既読にする");
    expect(content).toContain("markNotificationsAsReadAction");
  });

  it("未読バッジが含まれる", async () => {
    const content = await readSrc("app/(dashboard)/NotificationPanel.tsx");
    expect(content).toContain("unreadCount");
  });

  it("layout.tsx に NotificationBell が含まれる", async () => {
    const content = await readSrc("app/(dashboard)/layout.tsx");
    expect(content).toContain("NotificationBell");
  });
});

describe("テナント分離 静的検証", () => {
  it("watchRepository の全関数に organizationId がある", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    // create, findByUserAndDeal, findByUser, deleteByUserAndDeal で organizationId を使用
    expect(content).toContain("eq(watches.organizationId, organizationId)");
    const matches = content.match(/organizationId/g);
    expect(matches!.length).toBeGreaterThanOrEqual(8);
  });

  it("getNotifications の findByTargets 呼び出しに organizationId がある", async () => {
    const content = await readSrc("application/usecases/getNotifications.ts");
    expect(content).toContain("auditLogRepository.findByTargets(\n    organizationId,");
  });
});
