/**
 * getDealActivity usecase と activityAggregator の動的テスト。
 * モジュールモックを使って実際のビジネスロジックを検証する。
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { mock } from "bun:test";
import type { AuditLog } from "@/domain/models/auditLog";
import type { Interaction } from "@/domain/models/interaction";
import type { Contract } from "@/domain/models/contract";
import type { Invoice } from "@/domain/models/invoice";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  meetings: [] as Interaction[],
  contracts: [] as Contract[],
  invoices: [] as Invoice[],
  contractInteractions: [] as Interaction[],
  invoiceInteractions: [] as Interaction[],
  logs: [] as AuditLog[],
  findByTargetsCallArgs: null as {
    organizationId: string;
    targets: Array<{ targetType: string; targetId: string }>;
    opts: {
      limit?: number;
      includeActions?: string[];
      excludeActions?: string[];
    };
  } | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories/interactionRepository", () => ({
  findAllByDeal: async () => state.meetings,
  findAllByContract: async () => state.contractInteractions,
  findAllByInvoice: async () => state.invoiceInteractions,
}));

mock.module("@/infrastructure/repositories/contractRepository", () => ({
  findAllByDealId: async () => state.contracts,
}));

mock.module("@/infrastructure/repositories/invoiceRepository", () => ({
  findAllByContract: async () => state.invoices,
}));

mock.module("@/infrastructure/repositories/auditLogRepository", () => ({
  findByTargets: async (
    organizationId: string,
    targets: Array<{ targetType: string; targetId: string }>,
    opts: { limit?: number; includeActions?: string[]; excludeActions?: string[] }
  ) => {
    state.findByTargetsCallArgs = { organizationId, targets, opts };
    return state.logs;
  },
}));

import { getDealActivity } from "@/application/usecases/getDealActivity";
import { aggregateTimeline } from "@/lib/activityAggregator";
import { TIMELINE_ACTIONS, ACTIVITY_TIMELINE_LIMIT } from "@/lib/activityConfig";

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const DEAL_ID = "deal-001";
const ACTOR_A = "actor-A";
const ACTOR_B = "actor-B";

function makeLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "log-001",
    action: "deal.create",
    targetType: "deal",
    targetId: DEAL_ID,
    actorId: ACTOR_A,
    organizationId: ORG_ID,
    metadata: null,
    createdAt: new Date("2026-01-20T10:00:00Z"),
    ...overrides,
  };
}

function makeLogSeq(overrides: Partial<AuditLog>[], baseDate = new Date("2026-01-20T10:00:00Z")): AuditLog[] {
  // 新しい順（インデックス 0 が最新）でログを生成する
  return overrides.map((o, i) => ({
    id: `log-${String(i).padStart(3, "0")}`,
    action: "deal.create" as const,
    targetType: "deal" as const,
    targetId: DEAL_ID,
    actorId: ACTOR_A,
    organizationId: ORG_ID,
    metadata: null,
    createdAt: new Date(baseDate.getTime() - i * 1000), // 新しい順
    ...o,
  }));
}

// ---------------------------------------------------------------------------
// 共通リセット
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.meetings = [];
  state.contracts = [];
  state.invoices = [];
  state.contractInteractions = [];
  state.invoiceInteractions = [];
  state.logs = [];
  state.findByTargetsCallArgs = null;
  delete process.env.ACTIVITY_HIDDEN_ACTIONS;
});

// ---------------------------------------------------------------------------
// 分類テスト: 表示対象の 7 アクションが結果に含まれる
// ---------------------------------------------------------------------------

describe("分類テスト: 表示対象アクションがタイムラインに含まれる", () => {
  it("8 つの表示対象アクションがすべて結果に含まれる", async () => {
    const timelineActions = [
      "interaction.create",
      "meeting.create",
      "deal.create",
      "deal.updatePhase",
      "contract.create",
      "contract.updateStatus",
      "invoice.create",
      "invoice.update_status",
    ] as const;

    state.logs = timelineActions.map((action, i) =>
      makeLog({
        id: `log-${i}`,
        action,
        targetType: action.startsWith("interaction")
          ? "interaction"
          : action.startsWith("meeting")
          ? "meeting"
          : action.startsWith("deal")
          ? "deal"
          : action.startsWith("contract")
          ? "contract"
          : "invoice",
        targetId: `target-${i}`,
        metadata: null,
      })
    );

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const resultActions = result.logs.map((e) => e.action);
    for (const action of timelineActions) {
      expect(resultActions).toContain(action);
    }
  });
});

// ---------------------------------------------------------------------------
// 除外テスト: 除外対象アクションがタイムラインに含まれない
// ---------------------------------------------------------------------------

describe("除外テスト: 除外対象アクションがタイムラインに出ない", () => {
  it("findByTargets が includeActions を使うため、除外対象は DB から取得されない（モックが logs を直接制御）", async () => {
    // 除外対象を state.logs に含めても、テスト設計上 includeActions フィルタは DB 側で行われる。
    // ここでは includeActions に除外対象が含まれていないことを検証する。
    state.logs = [];

    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const includeActions = state.findByTargetsCallArgs?.opts.includeActions ?? [];
    const excludedActions = [
      "deal.update",
      "contract.update",
      "invoice.update",
      "meeting.update",
      "action_item.create",
      "action_item.update",
      "action_item.delete",
      "action_item.toggle",
      "action_item.updateStatus",
      "deal_contact.create",
      "deal_contact.delete",
    ];

    for (const excluded of excludedActions) {
      expect(includeActions).not.toContain(excluded);
    }
  });

  it("モックで除外対象ログを渡しても結果に含まれない（アプリ層の追加フィルタ検証）", async () => {
    // getHiddenActions で追加除外される場合のテスト
    // 正規の除外は DB 側 (includeActions) で行われるが、
    // 万が一漏れても HIDDEN_ACTIONS でカバーされることを確認
    process.env.ACTIVITY_HIDDEN_ACTIONS = "deal.create";
    state.logs = [
      makeLog({ id: "log-hidden", action: "deal.create" }),
      makeLog({ id: "log-visible", action: "deal.updatePhase" }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const resultActions = result.logs.map((e) => e.action);
    expect(resultActions).not.toContain("deal.create");
    expect(resultActions).toContain("deal.updatePhase");

    delete process.env.ACTIVITY_HIDDEN_ACTIONS;
  });
});

// ---------------------------------------------------------------------------
// 取得対象テスト: findByTargets の targets に action_item / deal_contact を含まない
// ---------------------------------------------------------------------------

describe("取得対象テスト: action_item / deal_contact が targets に含まれない", () => {
  it("findByTargets の targets 配列に action_item targetType が含まれない", async () => {
    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const targets = state.findByTargetsCallArgs?.targets ?? [];
    const targetTypes = targets.map((t) => t.targetType);
    expect(targetTypes).not.toContain("action_item");
    expect(targetTypes).not.toContain("deal_contact");
  });

  it("findByTargets の targets 配列に deal / interaction / meeting / contract / invoice が含まれる", async () => {
    state.meetings = [
      {
        id: "meeting-001",
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
        createdById: "user-001",
        version: 1,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
      },
    ];
    state.contracts = [
      {
        id: "contract-001",
        dealId: DEAL_ID,
        organizationId: ORG_ID,
        title: "テスト契約",
        contractType: null,
        amount: null,
        startDate: null,
        endDate: null,
        status: "active",
        renewalType: null,
        notes: null,
        estimateRequestId: null,
        version: 1,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ];
    state.invoices = [
      {
        id: "invoice-001",
        contractId: "contract-001",
        organizationId: ORG_ID,
        title: "テスト請求",
        amount: 100000,
        status: "scheduled",
        dueDate: null,
        invoicedAt: null,
        paidAt: null,
        notes: null,
        version: 1,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ];

    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const targets = state.findByTargetsCallArgs?.targets ?? [];
    const targetTypes = targets.map((t) => t.targetType);
    expect(targetTypes).toContain("deal");
    expect(targetTypes).toContain("interaction");
    expect(targetTypes).toContain("meeting");
    expect(targetTypes).toContain("contract");
    expect(targetTypes).toContain("invoice");
  });
});

// ---------------------------------------------------------------------------
// includeActions テスト: TIMELINE_ACTIONS が渡されている
// ---------------------------------------------------------------------------

describe("includeActions テスト: TIMELINE_ACTIONS が findByTargets に渡される", () => {
  it("findByTargets の opts.includeActions が TIMELINE_ACTIONS と一致する", async () => {
    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const includeActions = state.findByTargetsCallArgs?.opts.includeActions;
    expect(includeActions).toBeDefined();
    expect(includeActions).toEqual(TIMELINE_ACTIONS);
  });
});

// ---------------------------------------------------------------------------
// limit 未指定テスト: findByTargets に limit が渡されていない
// ---------------------------------------------------------------------------

describe("limit 未指定テスト: DB 取得時に limit を渡さない", () => {
  it("findByTargets の opts に limit が含まれない", async () => {
    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const opts = state.findByTargetsCallArgs?.opts;
    expect(opts).toBeDefined();
    expect(opts?.limit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 集約テスト: 連続する同一操作が件数つき 1 件に集約される
// ---------------------------------------------------------------------------

describe("集約テスト: 連続する同一操作が 1 件に集約される", () => {
  it("同一操作者が同一対象に 3 回連続で同じ操作を行った場合、1 件に集約され count: 3 になる", async () => {
    const baseDate = new Date("2026-01-20T10:00:00Z");
    state.logs = [
      makeLog({ id: "log-1", action: "deal.updatePhase", createdAt: new Date(baseDate.getTime()) }),
      makeLog({ id: "log-2", action: "deal.updatePhase", createdAt: new Date(baseDate.getTime() - 1000) }),
      makeLog({ id: "log-3", action: "deal.updatePhase", createdAt: new Date(baseDate.getTime() - 2000) }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].count).toBe(3);
    expect(result.logs[0].action).toBe("deal.updatePhase");
  });

  it("異なる操作者の操作は集約されない", async () => {
    const baseDate = new Date("2026-01-20T10:00:00Z");
    state.logs = [
      makeLog({ id: "log-1", action: "deal.updatePhase", actorId: ACTOR_A, createdAt: new Date(baseDate.getTime()) }),
      makeLog({ id: "log-2", action: "deal.updatePhase", actorId: ACTOR_B, createdAt: new Date(baseDate.getTime() - 1000) }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0].count).toBe(1);
    expect(result.logs[1].count).toBe(1);
  });

  it("非連続の同一操作は集約されない", async () => {
    const baseDate = new Date("2026-01-20T10:00:00Z");
    state.logs = [
      makeLog({ id: "log-1", action: "deal.updatePhase", createdAt: new Date(baseDate.getTime()) }),
      makeLog({ id: "log-2", action: "deal.create", createdAt: new Date(baseDate.getTime() - 1000) }),
      makeLog({ id: "log-3", action: "deal.updatePhase", createdAt: new Date(baseDate.getTime() - 2000) }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(3);
    expect(result.logs[0].action).toBe("deal.updatePhase");
    expect(result.logs[1].action).toBe("deal.create");
    expect(result.logs[2].action).toBe("deal.updatePhase");
  });
});

// ---------------------------------------------------------------------------
// 状態遷移集約テスト: 連続する状態遷移が正味遷移に集約される
// ---------------------------------------------------------------------------

describe("状態遷移集約テスト: 連続する状態遷移が正味遷移に集約される", () => {
  it("フェーズ変更が 3 回連続した場合、最初の from → 最後の to の正味遷移になる", async () => {
    const baseDate = new Date("2026-01-20T12:00:00Z");
    state.logs = [
      makeLog({
        id: "log-1",
        action: "deal.updatePhase",
        metadata: { fromPhase: "negotiation", toPhase: "won" },
        createdAt: new Date(baseDate.getTime()),
      }),
      makeLog({
        id: "log-2",
        action: "deal.updatePhase",
        metadata: { fromPhase: "proposed", toPhase: "negotiation" },
        createdAt: new Date(baseDate.getTime() - 1000),
      }),
      makeLog({
        id: "log-3",
        action: "deal.updatePhase",
        metadata: { fromPhase: "proposal_prep", toPhase: "proposed" },
        createdAt: new Date(baseDate.getTime() - 2000),
      }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].count).toBe(3);
    expect(result.logs[0].transition).toEqual({ from: "proposal_prep", to: "won" });
  });

  it("契約ステータス変更が連続する場合、正味遷移に集約される", async () => {
    const baseDate = new Date("2026-01-20T12:00:00Z");
    const CONTRACT_ID = "contract-001";
    state.logs = [
      makeLog({
        id: "log-1",
        action: "contract.updateStatus",
        targetType: "contract",
        targetId: CONTRACT_ID,
        metadata: { fromStatus: "active", toStatus: "completed" },
        createdAt: new Date(baseDate.getTime()),
      }),
      makeLog({
        id: "log-2",
        action: "contract.updateStatus",
        targetType: "contract",
        targetId: CONTRACT_ID,
        metadata: { fromStatus: "cancelled", toStatus: "active" },
        createdAt: new Date(baseDate.getTime() - 1000),
      }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].count).toBe(2);
    expect(result.logs[0].transition).toEqual({ from: "cancelled", to: "completed" });
  });
});

// ---------------------------------------------------------------------------
// 件数上限テスト: 集約後に ACTIVITY_TIMELINE_LIMIT が適用される
// ---------------------------------------------------------------------------

describe("件数上限テスト: 集約後に ACTIVITY_TIMELINE_LIMIT が適用される", () => {
  it("集約後の件数が ACTIVITY_TIMELINE_LIMIT を超える場合は上限件数に切り捨てられる", async () => {
    // 40 件の distinct ログ → 集約後も 40 件 → 上限 30 件で切られる
    const baseDate = new Date("2026-01-20T10:00:00Z");
    state.logs = Array.from({ length: 40 }, (_, i) =>
      makeLog({
        id: `log-${i}`,
        action: i % 2 === 0 ? "deal.create" : "deal.updatePhase",
        targetId: `target-${i}`, // distinct targetId で集約されない
        createdAt: new Date(baseDate.getTime() - i * 60000),
      })
    );

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    // 集約されないため 40 件 → ACTIVITY_TIMELINE_LIMIT (30) で切られる
    expect(result.logs).toHaveLength(ACTIVITY_TIMELINE_LIMIT);
  });

  it("集約で件数が減って上限以下になる場合はすべて返される", async () => {
    // 60 件のログだが、全部同一操作者・同一アクション・同一対象 → 1 件に集約
    const baseDate = new Date("2026-01-20T10:00:00Z");
    state.logs = Array.from({ length: 60 }, (_, i) =>
      makeLog({
        id: `log-${i}`,
        action: "deal.updatePhase",
        createdAt: new Date(baseDate.getTime() - i * 1000),
      })
    );

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    // 60 件が 1 件に集約 → 上限 30 件以下なのでそのまま返される
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].count).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// 遷移表示テスト: transition が正しく設定される
// ---------------------------------------------------------------------------

describe("遷移表示テスト: transition フィールドが正しく設定される", () => {
  it("deal.updatePhase ログに fromPhase/toPhase metadata がある場合、transition が設定される", async () => {
    state.logs = [
      makeLog({
        id: "log-1",
        action: "deal.updatePhase",
        metadata: { fromPhase: "proposal_prep", toPhase: "negotiation" },
      }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].transition).toEqual({ from: "proposal_prep", to: "negotiation" });
  });

  it("contract.updateStatus ログに fromStatus/toStatus metadata がある場合、transition が設定される", async () => {
    state.logs = [
      makeLog({
        id: "log-1",
        action: "contract.updateStatus",
        targetType: "contract",
        targetId: "contract-001",
        metadata: { fromStatus: "active", toStatus: "completed" },
      }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].transition).toEqual({ from: "active", to: "completed" });
  });

  it("invoice.update_status ログに fromStatus/toStatus metadata がある場合、transition が設定される", async () => {
    state.logs = [
      makeLog({
        id: "log-1",
        action: "invoice.update_status",
        targetType: "invoice",
        targetId: "invoice-001",
        metadata: { fromStatus: "scheduled", toStatus: "invoiced" },
      }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].transition).toEqual({ from: "scheduled", to: "invoiced" });
  });
});

// ---------------------------------------------------------------------------
// 遷移 metadata なしテスト: 既存ログで transition: null になる
// ---------------------------------------------------------------------------

describe("遷移 metadata なしテスト: metadata がない既存ログは transition: null", () => {
  it("invoice.update_status に metadata がない場合 transition は null になる", async () => {
    state.logs = [
      makeLog({
        id: "log-1",
        action: "invoice.update_status",
        targetType: "invoice",
        targetId: "invoice-001",
        metadata: null, // 遷移情報未記録の既存ログ
      }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].transition).toBeNull();
  });

  it("deal.updatePhase に metadata がない場合 transition は null になる", async () => {
    state.logs = [
      makeLog({
        id: "log-1",
        action: "deal.updatePhase",
        metadata: null,
      }),
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].transition).toBeNull();
  });

  it("非遷移系アクション（deal.create）は transition: null になる", async () => {
    state.logs = [makeLog({ id: "log-1", action: "deal.create" })];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].transition).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 集約ロジック単体テスト: activityAggregator の純粋関数テスト
// ---------------------------------------------------------------------------

describe("aggregateTimeline 純粋関数テスト", () => {
  it("空の配列を渡すと空の配列が返る", () => {
    expect(aggregateTimeline([])).toEqual([]);
  });

  it("1 件のログが 1 件の TimelineEntry に変換される", () => {
    const log = makeLog({ id: "log-1", action: "deal.create" });
    const result = aggregateTimeline([log]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("log-1");
    expect(result[0].action).toBe("deal.create");
    expect(result[0].count).toBe(1);
    expect(result[0].transition).toBeNull();
  });

  it("連続する同一 (actorId, action, targetId) が 1 件に集約され count が正しい", () => {
    const baseDate = new Date("2026-01-20T10:00:00Z");
    const logs = [
      makeLog({ id: "log-1", actorId: ACTOR_A, action: "deal.updatePhase", targetId: DEAL_ID, createdAt: new Date(baseDate.getTime()) }),
      makeLog({ id: "log-2", actorId: ACTOR_A, action: "deal.updatePhase", targetId: DEAL_ID, createdAt: new Date(baseDate.getTime() - 1000) }),
      makeLog({ id: "log-3", actorId: ACTOR_A, action: "deal.updatePhase", targetId: DEAL_ID, createdAt: new Date(baseDate.getTime() - 2000) }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
    expect(result[0].id).toBe("log-1"); // 最新のエントリの id を持つ
    expect(result[0].createdAt).toEqual(new Date(baseDate.getTime())); // 最新の createdAt
  });

  it("異なる actorId では集約されない", () => {
    const logs = [
      makeLog({ id: "log-1", actorId: ACTOR_A, action: "deal.updatePhase" }),
      makeLog({ id: "log-2", actorId: ACTOR_B, action: "deal.updatePhase" }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(2);
    expect(result[0].actorId).toBe(ACTOR_A);
    expect(result[1].actorId).toBe(ACTOR_B);
  });

  it("異なる action では集約されない", () => {
    const logs = [
      makeLog({ id: "log-1", action: "deal.updatePhase" }),
      makeLog({ id: "log-2", action: "deal.create" }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(2);
  });

  it("異なる targetId では集約されない", () => {
    const logs = [
      makeLog({ id: "log-1", action: "deal.updatePhase", targetId: "deal-001" }),
      makeLog({ id: "log-2", action: "deal.updatePhase", targetId: "deal-002" }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(2);
  });

  it("非連続の同一操作は集約されない", () => {
    const logs = [
      makeLog({ id: "log-1", action: "deal.updatePhase", targetId: DEAL_ID }),
      makeLog({ id: "log-2", action: "deal.create", targetId: DEAL_ID }),
      makeLog({ id: "log-3", action: "deal.updatePhase", targetId: DEAL_ID }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(3);
    expect(result[0].action).toBe("deal.updatePhase");
    expect(result[1].action).toBe("deal.create");
    expect(result[2].action).toBe("deal.updatePhase");
  });

  it("状態遷移系アクションが連続する場合、最古 from → 最新 to の正味遷移になる", () => {
    const baseDate = new Date("2026-01-20T12:00:00Z");
    const logs = [
      makeLog({
        id: "log-1",
        action: "deal.updatePhase",
        metadata: { fromPhase: "negotiation", toPhase: "won" },
        createdAt: new Date(baseDate.getTime()),
      }),
      makeLog({
        id: "log-2",
        action: "deal.updatePhase",
        metadata: { fromPhase: "proposed", toPhase: "negotiation" },
        createdAt: new Date(baseDate.getTime() - 1000),
      }),
      makeLog({
        id: "log-3",
        action: "deal.updatePhase",
        metadata: { fromPhase: "proposal_prep", toPhase: "proposed" },
        createdAt: new Date(baseDate.getTime() - 2000),
      }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
    expect(result[0].transition).toEqual({ from: "proposal_prep", to: "won" });
  });

  it("遷移情報のない既存ログ（metadata: null）は transition: null になる", () => {
    const logs = [
      makeLog({ id: "log-1", action: "invoice.update_status", metadata: null }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(1);
    expect(result[0].transition).toBeNull();
  });

  it("非遷移系アクションは transition: null になる", () => {
    const logs = [makeLog({ id: "log-1", action: "deal.create", metadata: null })];
    const result = aggregateTimeline(logs);

    expect(result[0].transition).toBeNull();
  });

  it("contract.updateStatus の連続遷移が正味遷移に集約される", () => {
    const baseDate = new Date("2026-01-20T12:00:00Z");
    const CONTRACT_ID = "contract-001";
    const logs = [
      makeLog({
        id: "log-1",
        action: "contract.updateStatus",
        targetType: "contract",
        targetId: CONTRACT_ID,
        metadata: { fromStatus: "active", toStatus: "completed" },
        createdAt: new Date(baseDate.getTime()),
      }),
      makeLog({
        id: "log-2",
        action: "contract.updateStatus",
        targetType: "contract",
        targetId: CONTRACT_ID,
        metadata: { fromStatus: "cancelled", toStatus: "active" },
        createdAt: new Date(baseDate.getTime() - 1000),
      }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(1);
    expect(result[0].transition).toEqual({ from: "cancelled", to: "completed" });
  });

  it("invoice.update_status の連続遷移が正味遷移に集約される", () => {
    const baseDate = new Date("2026-01-20T12:00:00Z");
    const INVOICE_ID = "invoice-001";
    const logs = [
      makeLog({
        id: "log-1",
        action: "invoice.update_status",
        targetType: "invoice",
        targetId: INVOICE_ID,
        metadata: { fromStatus: "invoiced", toStatus: "paid" },
        createdAt: new Date(baseDate.getTime()),
      }),
      makeLog({
        id: "log-2",
        action: "invoice.update_status",
        targetType: "invoice",
        targetId: INVOICE_ID,
        metadata: { fromStatus: "scheduled", toStatus: "invoiced" },
        createdAt: new Date(baseDate.getTime() - 1000),
      }),
    ];
    const result = aggregateTimeline(logs);

    expect(result).toHaveLength(1);
    expect(result[0].transition).toEqual({ from: "scheduled", to: "paid" });
  });
});

// ---------------------------------------------------------------------------
// デュアルターゲットテスト: interaction と meeting の両 targetType が targets に含まれる
// ---------------------------------------------------------------------------

describe("デュアルターゲットテスト: interaction と meeting の両 targetType が targets に含まれる", () => {
  it("meetings が 1 件ある場合、targets に interaction:<id> と meeting:<id> の両方が含まれる", async () => {
    const MEETING_ID = "meeting-001";
    state.meetings = [
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
        createdById: "user-001",
        version: 1,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
      },
    ];

    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
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

  it("targetInfoMap に interaction:<id> と meeting:<id> の両キーが登録される", async () => {
    const MEETING_ID = "meeting-001";
    state.meetings = [
      {
        id: MEETING_ID,
        kind: "meeting" as const,
        dealId: DEAL_ID,
        inquiryId: null,
        contractId: null,
        invoiceId: null,
        clientId: null,
        organizationId: ORG_ID,
        meetingType: "hearing",
        date: new Date("2026-01-15"),
        location: null,
        attendees: [],
        summary: null,
        actionItems: [],
        details: null,
        createdById: "user-001",
        version: 1,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
      },
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.targetInfoMap[`interaction:${MEETING_ID}`]).toBeDefined();
    expect(result.targetInfoMap[`meeting:${MEETING_ID}`]).toBeDefined();
    // 両キーが同じ値を持つ
    expect(result.targetInfoMap[`interaction:${MEETING_ID}`]).toEqual(
      result.targetInfoMap[`meeting:${MEETING_ID}`]
    );
  });

  it("TIMELINE_ACTIONS に interaction.create が含まれる", () => {
    expect(TIMELINE_ACTIONS).toContain("interaction.create");
    expect(TIMELINE_ACTIONS).toContain("meeting.create");
  });
});

// ---------------------------------------------------------------------------
// 契約・請求経由の顧客接点タイムライン統合テスト
// ---------------------------------------------------------------------------

describe("タイムライン統合テスト: 契約・請求経由の顧客接点が targets に含まれる", () => {
  it("契約調整の顧客接点が targets に含まれる", async () => {
    const CONTRACT_ID = "contract-001";
    const INTERACTION_ID = "ci-001";

    state.contracts = [
      {
        id: CONTRACT_ID,
        dealId: DEAL_ID,
        organizationId: ORG_ID,
        clientId: "client-001",
        title: "テスト契約",
        contractType: null,
        amount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: null,
        paymentTerms: null,
        renewalType: "one_time",
        renewalCycle: null,
        status: "active",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        version: 1,
      },
    ];
    state.contractInteractions = [
      {
        id: INTERACTION_ID,
        organizationId: ORG_ID,
        kind: "contract_adjustment" as const,
        dealId: null,
        inquiryId: null,
        contractId: CONTRACT_ID,
        invoiceId: null,
        clientId: null,
        meetingType: null,
        date: new Date("2026-06-01"),
        location: null,
        attendees: [],
        summary: "条件変更の交渉",
        actionItems: [],
        details: null,
        createdById: ACTOR_A,
        version: 1,
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
      },
    ];

    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const targets = state.findByTargetsCallArgs?.targets ?? [];
    const contractInteractionTarget = targets.find(
      (t) => t.targetType === "interaction" && t.targetId === INTERACTION_ID
    );
    expect(contractInteractionTarget).toBeDefined();
  });

  it("請求調整の顧客接点が targets に含まれる", async () => {
    const CONTRACT_ID = "contract-001";
    const INVOICE_ID = "invoice-001";
    const INTERACTION_ID = "ii-001";

    state.contracts = [
      {
        id: CONTRACT_ID,
        dealId: DEAL_ID,
        organizationId: ORG_ID,
        clientId: "client-001",
        title: "テスト契約",
        contractType: null,
        amount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: null,
        paymentTerms: null,
        renewalType: "one_time",
        renewalCycle: null,
        status: "active",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        version: 1,
      },
    ];
    state.invoices = [
      {
        id: INVOICE_ID,
        contractId: CONTRACT_ID,
        organizationId: ORG_ID,
        title: "テスト請求",
        amount: 500000,
        issueDate: new Date("2026-06-01"),
        dueDate: new Date("2026-06-30"),
        status: "invoiced",
        invoicedAt: new Date("2026-06-01"),
        paidAt: null,
        notes: null,
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
        version: 1,
      },
    ];
    state.invoiceInteractions = [
      {
        id: INTERACTION_ID,
        organizationId: ORG_ID,
        kind: "invoice_adjustment" as const,
        dealId: null,
        inquiryId: null,
        contractId: null,
        invoiceId: INVOICE_ID,
        clientId: null,
        meetingType: null,
        date: new Date("2026-06-15"),
        location: null,
        attendees: [],
        summary: "請求金額の調整",
        actionItems: [],
        details: null,
        createdById: ACTOR_A,
        version: 1,
        createdAt: new Date("2026-06-15"),
        updatedAt: new Date("2026-06-15"),
      },
    ];

    await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    const targets = state.findByTargetsCallArgs?.targets ?? [];
    const invoiceInteractionTarget = targets.find(
      (t) => t.targetType === "interaction" && t.targetId === INTERACTION_ID
    );
    expect(invoiceInteractionTarget).toBeDefined();
  });

  it("契約調整の顧客接点が targetInfoMap に登録される", async () => {
    const CONTRACT_ID = "contract-001";
    const INTERACTION_ID = "ci-002";

    state.contracts = [
      {
        id: CONTRACT_ID,
        dealId: DEAL_ID,
        organizationId: ORG_ID,
        clientId: "client-001",
        title: "テスト契約",
        contractType: null,
        amount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: null,
        paymentTerms: null,
        renewalType: "one_time",
        renewalCycle: null,
        status: "active",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        version: 1,
      },
    ];
    state.contractInteractions = [
      {
        id: INTERACTION_ID,
        organizationId: ORG_ID,
        kind: "contract_adjustment" as const,
        dealId: null,
        inquiryId: null,
        contractId: CONTRACT_ID,
        invoiceId: null,
        clientId: null,
        meetingType: null,
        date: new Date("2026-06-01"),
        location: null,
        attendees: [],
        summary: "条件変更",
        actionItems: [],
        details: null,
        createdById: ACTOR_A,
        version: 1,
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
      },
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.targetInfoMap[`interaction:${INTERACTION_ID}`]).toBeDefined();
    const info = result.targetInfoMap[`interaction:${INTERACTION_ID}`];
    expect(info.label).toContain("契約調整");
    expect(info.href).toContain(`/contracts/${CONTRACT_ID}`);
  });

  it("請求調整の顧客接点が targetInfoMap に登録される", async () => {
    const CONTRACT_ID = "contract-001";
    const INVOICE_ID = "invoice-002";
    const INTERACTION_ID = "ii-002";

    state.contracts = [
      {
        id: CONTRACT_ID,
        dealId: DEAL_ID,
        organizationId: ORG_ID,
        clientId: "client-001",
        title: "テスト契約",
        contractType: null,
        amount: 1000000,
        startDate: new Date("2026-01-01"),
        endDate: null,
        paymentTerms: null,
        renewalType: "one_time",
        renewalCycle: null,
        status: "active",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        version: 1,
      },
    ];
    state.invoices = [
      {
        id: INVOICE_ID,
        contractId: CONTRACT_ID,
        organizationId: ORG_ID,
        title: "テスト請求",
        amount: 300000,
        issueDate: new Date("2026-06-01"),
        dueDate: new Date("2026-06-30"),
        status: "invoiced",
        invoicedAt: new Date("2026-06-01"),
        paidAt: null,
        notes: null,
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-01"),
        version: 1,
      },
    ];
    state.invoiceInteractions = [
      {
        id: INTERACTION_ID,
        organizationId: ORG_ID,
        kind: "invoice_adjustment" as const,
        dealId: null,
        inquiryId: null,
        contractId: null,
        invoiceId: INVOICE_ID,
        clientId: null,
        meetingType: null,
        date: new Date("2026-06-20"),
        location: null,
        attendees: [],
        summary: "金額調整",
        actionItems: [],
        details: null,
        createdById: ACTOR_A,
        version: 1,
        createdAt: new Date("2026-06-20"),
        updatedAt: new Date("2026-06-20"),
      },
    ];

    const result = await getDealActivity({
      dealId: DEAL_ID,
      organizationId: ORG_ID,
      dealTitle: "テスト案件",
    });

    expect(result.targetInfoMap[`interaction:${INTERACTION_ID}`]).toBeDefined();
    const info = result.targetInfoMap[`interaction:${INTERACTION_ID}`];
    expect(info.label).toContain("請求調整");
    expect(info.href).toContain(`/contracts/${CONTRACT_ID}/invoices/${INVOICE_ID}`);
  });
});
