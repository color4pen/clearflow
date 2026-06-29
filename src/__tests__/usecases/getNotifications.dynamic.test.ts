/**
 * getNotifications usecase の動的テスト。
 * モジュールモックを使って実際のビジネスロジックを検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Watch } from "@/domain/models/watch";
import type { Deal } from "@/domain/models/deal";
import type { AuditLog } from "@/domain/models/auditLog";
import type { Interaction } from "@/domain/models/interaction";
import { NOTIFICATION_ACTIONS } from "@/domain/models/notification";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  watches: [] as Watch[],
  deal: null as Deal | null,
  interactions: [] as Interaction[],
  logs: [] as AuditLog[],
  findByTargetsCallArgs: null as {
    organizationId: string;
    targets: Array<{ targetType: string; targetId: string }>;
    opts: {
      includeActions?: string[];
      excludeActorId?: string;
      afterDate?: Date;
    };
  } | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories/watchRepository", () => ({
  findByUser: async () => state.watches,
}));

mock.module("@/infrastructure/repositories/dealRepository", () => ({
  findById: async () => state.deal,
}));

mock.module("@/infrastructure/repositories/interactionRepository", () => ({
  findAllByDeal: async () => state.interactions,
}));

mock.module("@/infrastructure/repositories/contractRepository", () => ({
  findAllByDealId: async () => [],
}));

mock.module("@/infrastructure/repositories/invoiceRepository", () => ({
  findAllByContract: async () => [],
}));

mock.module("@/infrastructure/repositories/actionItemRepository", () => ({
  findByDeal: async () => [],
}));

mock.module("@/infrastructure/repositories/dealContactRepository", () => ({
  findByDeal: async () => [],
}));

mock.module("@/infrastructure/repositories/auditLogRepository", () => ({
  findByTargets: async (
    organizationId: string,
    targets: Array<{ targetType: string; targetId: string }>,
    opts: { includeActions?: string[]; excludeActorId?: string; afterDate?: Date }
  ) => {
    state.findByTargetsCallArgs = { organizationId, targets, opts };
    return state.logs;
  },
}));

import { getNotifications } from "@/application/usecases/getNotifications";

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const USER_ID = "user-001";
const OTHER_USER_ID = "user-002";
const DEAL_ID = "deal-001";

function makeWatch(overrides: Partial<Watch> = {}): Watch {
  return {
    id: "watch-001",
    userId: USER_ID,
    dealId: DEAL_ID,
    organizationId: ORG_ID,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: DEAL_ID,
    organizationId: ORG_ID,
    inquiryId: null,
    clientId: "client-001",
    title: "テスト案件",
    description: null,
    phase: "proposal_prep",
    estimatedAmount: null,
    estimatedStartDate: null,
    estimatedEndDate: null,
    contractType: null,
    assigneeId: null,
    technicalLeadId: null,
    estimateRequestId: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
    ...overrides,
  };
}

function makeLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "log-001",
    action: "deal.update",
    targetType: "deal",
    targetId: DEAL_ID,
    actorId: OTHER_USER_ID,
    organizationId: ORG_ID,
    metadata: null,
    createdAt: new Date("2026-01-20T10:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("getNotifications watch 0 件の場合", () => {
  beforeEach(() => {
    state.watches = [];
    state.deal = makeDeal();
    state.interactions = [];
    state.logs = [];
    state.findByTargetsCallArgs = null;
  });

  it("watch が 0 件の場合は空の結果を返す", async () => {
    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    expect(result.notifications).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
    expect(state.findByTargetsCallArgs).toBeNull();
  });
});

describe("TC-009: watch 開始前のログは通知に含まれない", () => {
  beforeEach(() => {
    state.findByTargetsCallArgs = null;
  });

  it("watch.createdAt より前の createdAt を持つログは除外される", async () => {
    const watchCreatedAt = new Date("2026-01-15T10:00:00Z");
    const beforeWatchLog = makeLog({
      id: "log-before",
      createdAt: new Date("2026-01-10T10:00:00Z"), // watch より前
    });
    const afterWatchLog = makeLog({
      id: "log-after",
      createdAt: new Date("2026-01-20T10:00:00Z"), // watch より後
    });

    state.watches = [makeWatch({ createdAt: watchCreatedAt })];
    state.deal = makeDeal();
    state.logs = [beforeWatchLog, afterWatchLog];

    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    // watch 開始後のログのみ含まれる
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].log.id).toBe("log-after");
  });

  it("watch.createdAt と同時刻のログは含まれる（境界値）", async () => {
    const watchCreatedAt = new Date("2026-01-15T10:00:00Z");
    const boundaryLog = makeLog({
      id: "log-boundary",
      createdAt: watchCreatedAt, // watch と同時刻
    });

    state.watches = [makeWatch({ createdAt: watchCreatedAt })];
    state.deal = makeDeal();
    state.logs = [boundaryLog];

    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].log.id).toBe("log-boundary");
  });
});

describe("TC-008: 本人操作の除外（auditLogRepository への excludeActorId 伝達）", () => {
  beforeEach(() => {
    state.findByTargetsCallArgs = null;
  });

  it("getNotifications が findByTargets に excludeActorId: userId を渡す", async () => {
    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.logs = [];

    await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    expect(state.findByTargetsCallArgs).not.toBeNull();
    expect(state.findByTargetsCallArgs?.opts.excludeActorId).toBe(USER_ID);
  });

  it("getNotifications が findByTargets に organizationId を渡す（テナント分離）", async () => {
    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.logs = [];

    await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    expect(state.findByTargetsCallArgs?.organizationId).toBe(ORG_ID);
  });

  it("getNotifications が findByTargets に NOTIFICATION_ACTIONS を渡す（通知対象アクションのみ）", async () => {
    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.logs = [];

    await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    const includeActions = state.findByTargetsCallArgs?.opts.includeActions;
    expect(includeActions).toBeDefined();
    expect(includeActions).toContain("deal.update");
    expect(includeActions).toContain("deal.updatePhase");
    expect(includeActions).toContain("meeting.create");
    expect(includeActions).toContain("action_item.create");
    expect(includeActions).toContain("contract.create");
    // 通知対象外のアクションは含まれない
    expect(includeActions).not.toContain("deal.create");
    expect(includeActions).not.toContain("deal.delete");
    expect(includeActions).not.toContain("invoice.create");
  });
});

describe("TC-012: 初回アクセスで全通知が未読", () => {
  it("notificationsLastSeenAt が null の場合は全通知が isUnread: true", async () => {
    const log1 = makeLog({ id: "log-1", createdAt: new Date("2026-01-20T10:00:00Z") });
    const log2 = makeLog({ id: "log-2", createdAt: new Date("2026-01-21T10:00:00Z") });

    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.logs = [log1, log2];

    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null, // 初回アクセス
    });

    expect(result.notifications).toHaveLength(2);
    expect(result.notifications.every((n) => n.isUnread)).toBe(true);
    expect(result.unreadCount).toBe(2);
  });
});

describe("TC-013: 既読後の新しい通知のみ未読 / unreadCount の正確性", () => {
  it("notificationsLastSeenAt 以降のログのみ isUnread: true になる", async () => {
    const lastSeenAt = new Date("2026-01-18T00:00:00Z");
    const oldLog = makeLog({
      id: "log-old",
      createdAt: new Date("2026-01-16T10:00:00Z"), // lastSeenAt より前
    });
    const newLog = makeLog({
      id: "log-new",
      createdAt: new Date("2026-01-20T10:00:00Z"), // lastSeenAt より後
    });

    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.logs = [oldLog, newLog];

    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: lastSeenAt,
    });

    expect(result.notifications).toHaveLength(2);

    const oldNotif = result.notifications.find((n) => n.log.id === "log-old");
    const newNotif = result.notifications.find((n) => n.log.id === "log-new");

    expect(oldNotif?.isUnread).toBe(false); // 既読
    expect(newNotif?.isUnread).toBe(true);  // 未読

    expect(result.unreadCount).toBe(1);
  });

  it("全通知が lastSeenAt より前の場合は unreadCount が 0", async () => {
    const lastSeenAt = new Date("2026-02-01T00:00:00Z");
    const log1 = makeLog({ id: "log-1", createdAt: new Date("2026-01-20T10:00:00Z") });
    const log2 = makeLog({ id: "log-2", createdAt: new Date("2026-01-21T10:00:00Z") });

    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.logs = [log1, log2];

    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: lastSeenAt,
    });

    expect(result.notifications.every((n) => !n.isUnread)).toBe(true);
    expect(result.unreadCount).toBe(0);
  });
});

describe("通知に dealId と dealTitle が含まれる", () => {
  it("notifications に dealId と dealTitle が正しく設定される", async () => {
    state.watches = [makeWatch()];
    state.deal = makeDeal({ title: "テスト案件タイトル" });
    state.logs = [makeLog()];

    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].dealId).toBe(DEAL_ID);
    expect(result.notifications[0].dealTitle).toBe("テスト案件タイトル");
  });
});

describe("watch している案件の deal が見つからない場合", () => {
  it("dealRepository.findById が null を返す案件は通知に含まれない", async () => {
    state.watches = [makeWatch()];
    state.deal = null; // deal が見つからない
    state.logs = [makeLog()];

    const result = await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    expect(result.notifications).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// NOTIFICATION_ACTIONS に interaction.create が含まれる
// ---------------------------------------------------------------------------

describe("NOTIFICATION_ACTIONS に interaction.create / meeting.create の両方が含まれる", () => {
  it("NOTIFICATION_ACTIONS に interaction.create が含まれる", () => {
    expect(NOTIFICATION_ACTIONS).toContain("interaction.create");
  });

  it("NOTIFICATION_ACTIONS に meeting.create が含まれる（後方互換）", () => {
    expect(NOTIFICATION_ACTIONS).toContain("meeting.create");
  });

  it("getNotifications が findByTargets に interaction.create を含む includeActions を渡す", async () => {
    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.interactions = [];
    state.logs = [];
    state.findByTargetsCallArgs = null;

    await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    const includeActions = state.findByTargetsCallArgs?.opts.includeActions ?? [];
    expect(includeActions).toContain("interaction.create");
    expect(includeActions).toContain("meeting.create");
  });
});

// ---------------------------------------------------------------------------
// デュアルターゲットテスト: interaction と meeting の両 targetType が targets に含まれる
// ---------------------------------------------------------------------------

describe("デュアルターゲットテスト: interaction と meeting の両 targetType が targets に含まれる", () => {
  it("interactions が 1 件ある場合、targets に interaction:<id> と meeting:<id> の両方が含まれる", async () => {
    const MEETING_ID = "meeting-001";
    state.watches = [makeWatch()];
    state.deal = makeDeal();
    state.interactions = [
      {
        id: MEETING_ID,
        kind: "meeting" as const,
        dealId: DEAL_ID,
        inquiryId: null,
        contractId: null,
        invoiceId: null,
        clientId: null,
        organizationId: ORG_ID,
        meetingType: null,
        date: new Date("2026-01-15"),
        location: null,
        attendees: [],
        summary: null,
        actionItems: [],
        details: null,
        createdById: OTHER_USER_ID,
        version: 1,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
      },
    ];
    state.logs = [];
    state.findByTargetsCallArgs = null;

    await getNotifications({
      userId: USER_ID,
      organizationId: ORG_ID,
      notificationsLastSeenAt: null,
    });

    const targets = state.findByTargetsCallArgs?.targets ?? [];
    const interactionTarget = targets.find(
      (t) => t.targetType === "interaction" && t.targetId === MEETING_ID
    );
    const meetingTarget = targets.find(
      (t) => t.targetType === "meeting" && t.targetId === MEETING_ID
    );

    expect(interactionTarget).toBeDefined();
    expect(meetingTarget).toBeDefined();
  });
});
