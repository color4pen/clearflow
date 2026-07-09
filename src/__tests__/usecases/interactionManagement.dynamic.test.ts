/**
 * 顧客接点（Interaction）管理ユースケースの動的テスト。
 * mock.module を使って DB に依存せず、createMeeting / updateMeeting / getMeeting /
 * listMeetings / listMeetingsByInquiry の振る舞いを検証する。
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { mock } from "bun:test";
import type { Interaction } from "@/domain/models/interaction";
import type { Deal } from "@/domain/models/deal";
import type { Inquiry } from "@/domain/models/inquiry";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  interaction: null as Interaction | null,
  deal: null as Deal | null,
  inquiry: null as Inquiry | null,
  createdInteraction: null as Interaction | null,
  updatedInteraction: null as Interaction | null,
  byDealInteractions: [] as Interaction[],
  byInquiryInteractions: [] as Interaction[],
  auditArgs: null as {
    action: string;
    targetType: string;
    targetId: string;
    actorId: string;
    organizationId: string;
    metadata: Record<string, unknown> | null;
  } | null,
  createArgs: null as Record<string, unknown> | null,
  updateArgs: null as Record<string, unknown> | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories", () => ({
  interactionRepository: {
    create: async (data: Record<string, unknown>) => {
      state.createArgs = data;
      return state.createdInteraction!;
    },
    findById: async () => state.interaction,
    findAllByDeal: async () => state.byDealInteractions,
    findAllByInquiry: async () => state.byInquiryInteractions,
    update: async (_id: string, _orgId: string, data: Record<string, unknown>) => {
      state.updateArgs = data;
      return state.updatedInteraction;
    },
  },
  dealRepository: {
    findById: async () => state.deal,
  },
  inquiryRepository: {
    findById: async () => state.inquiry,
  },
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (args: typeof state.auditArgs) => {
    state.auditArgs = args;
  },
}));

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { createMeeting } from "@/application/usecases/createMeeting";
import { updateMeeting } from "@/application/usecases/updateMeeting";
import { getMeeting } from "@/application/usecases/getMeeting";
import { listMeetings } from "@/application/usecases/listMeetings";
import { listMeetingsByInquiry } from "@/application/usecases/listMeetingsByInquiry";

// ---------------------------------------------------------------------------
// テストデータファクトリ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const DEAL_ID = "deal-001";
const INQUIRY_ID = "inquiry-001";
const ACTOR_ID = "actor-001";
const INTERACTION_ID = "interaction-001";

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: INTERACTION_ID,
    organizationId: ORG_ID,
    kind: "meeting",
    dealId: DEAL_ID,
    inquiryId: null,
    contractId: null,
    invoiceId: null,
    clientId: null,
    meetingType: "hearing",
    date: new Date("2026-01-15T10:00:00Z"),
    location: null,
    attendees: [],
    summary: "テスト商談の要約",
    preparation: null,
    actionItems: [],
    details: null,
    createdById: ACTOR_ID,
    version: 1,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

function makeDeal(): Deal {
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
  };
}

function makeInquiry(): Inquiry {
  return {
    id: INQUIRY_ID,
    organizationId: ORG_ID,
    clientId: "client-001",
    title: "テスト引合",
    description: null,
    status: "new",
    assigneeId: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

// ---------------------------------------------------------------------------
// 共通リセット
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.interaction = null;
  state.deal = null;
  state.inquiry = null;
  state.createdInteraction = null;
  state.updatedInteraction = null;
  state.byDealInteractions = [];
  state.byInquiryInteractions = [];
  state.auditArgs = null;
  state.createArgs = null;
  state.updateArgs = null;
});

// ---------------------------------------------------------------------------
// createMeeting テスト
// ---------------------------------------------------------------------------

describe("createMeeting — kind=meeting の Interaction 作成", () => {
  it("deal が存在する場合に Interaction が作成され ok: true が返る", async () => {
    state.deal = makeDeal();
    state.createdInteraction = makeInteraction();

    const result = await createMeeting({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      kind: "meeting",
      dealId: DEAL_ID,
      date: new Date("2026-01-15T10:00:00Z"),
      attendees: [],
      actionItems: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meeting.kind).toBe("meeting");
      expect(result.meeting.id).toBe(INTERACTION_ID);
    }
  });

  it("interactionRepository.create に kind: 'meeting' が渡される", async () => {
    state.deal = makeDeal();
    state.createdInteraction = makeInteraction();

    await createMeeting({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      kind: "meeting",
      dealId: DEAL_ID,
      date: new Date("2026-01-15T10:00:00Z"),
      attendees: [],
      actionItems: [],
    });

    expect(state.createArgs).not.toBeNull();
    expect(state.createArgs?.kind).toBe("meeting");
  });

  it("監査ログが interaction.create / targetType: interaction / metadata.kind: meeting で記録される", async () => {
    state.deal = makeDeal();
    state.createdInteraction = makeInteraction();

    await createMeeting({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      kind: "meeting",
      dealId: DEAL_ID,
      date: new Date("2026-01-15T10:00:00Z"),
      attendees: [],
      actionItems: [],
    });

    expect(state.auditArgs).not.toBeNull();
    expect(state.auditArgs?.action).toBe("interaction.create");
    expect(state.auditArgs?.targetType).toBe("interaction");
    expect(state.auditArgs?.metadata).toEqual({ kind: "meeting" });
  });

  it("dealId も inquiryId も指定しない場合に ok: false が返る", async () => {
    const result = await createMeeting({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      kind: "meeting",
      date: new Date("2026-01-15T10:00:00Z"),
      attendees: [],
      actionItems: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("案件または引合");
    }
  });

  it("dealId を指定したが deal が存在しない場合に ok: false が返る", async () => {
    state.deal = null; // deal が見つからない

    const result = await createMeeting({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      kind: "meeting",
      dealId: DEAL_ID,
      date: new Date("2026-01-15T10:00:00Z"),
      attendees: [],
      actionItems: [],
    });

    expect(result.ok).toBe(false);
  });

  it("inquiryId を指定した場合に inquiry の存在確認が行われる", async () => {
    state.inquiry = makeInquiry();
    state.createdInteraction = makeInteraction({ dealId: null, inquiryId: INQUIRY_ID });

    const result = await createMeeting({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      kind: "meeting",
      inquiryId: INQUIRY_ID,
      date: new Date("2026-01-15T10:00:00Z"),
      attendees: [],
      actionItems: [],
    });

    expect(result.ok).toBe(true);
  });

  it("meetingType が hearing 以外の場合、details が null で create に渡される", async () => {
    state.deal = makeDeal();
    state.createdInteraction = makeInteraction({ meetingType: "proposal", details: null });

    await createMeeting({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      kind: "meeting",
      dealId: DEAL_ID,
      meetingType: "proposal",
      date: new Date("2026-01-15T10:00:00Z"),
      attendees: [],
      actionItems: [],
      details: { challenge: "課題", budget: null, decisionMaker: null, timeline: null, competitors: null, notes: null },
    });

    expect(state.createArgs?.details).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateMeeting テスト
// ---------------------------------------------------------------------------

describe("updateMeeting — kind=meeting の Interaction 更新", () => {
  it("Interaction が存在する場合に更新されて ok: true が返る", async () => {
    const existing = makeInteraction();
    state.interaction = existing;
    state.updatedInteraction = makeInteraction({ summary: "更新後の要約" });

    const result = await updateMeeting({
      meetingId: INTERACTION_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "更新後の要約",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meeting.summary).toBe("更新後の要約");
    }
  });

  it("監査ログが interaction.update / targetType: interaction / metadata.kind: meeting で記録される", async () => {
    state.interaction = makeInteraction();
    state.updatedInteraction = makeInteraction();

    await updateMeeting({
      meetingId: INTERACTION_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      summary: "更新内容",
    });

    expect(state.auditArgs?.action).toBe("interaction.update");
    expect(state.auditArgs?.targetType).toBe("interaction");
    expect(state.auditArgs?.metadata).toEqual({ kind: "meeting" });
  });

  it("Interaction が存在しない場合に ok: false が返る", async () => {
    state.interaction = null;

    const result = await updateMeeting({
      meetingId: INTERACTION_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
    });

    expect(result.ok).toBe(false);
  });

  it("楽観ロック失敗（update が null を返す）の場合に ok: false が返る", async () => {
    state.interaction = makeInteraction();
    state.updatedInteraction = null; // update 失敗

    const result = await updateMeeting({
      meetingId: INTERACTION_ID,
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("他のユーザー");
    }
  });
});

// ---------------------------------------------------------------------------
// getMeeting テスト
// ---------------------------------------------------------------------------

describe("getMeeting — Interaction の取得", () => {
  it("Interaction が存在する場合に返す", async () => {
    state.interaction = makeInteraction();

    const result = await getMeeting(INTERACTION_ID, ORG_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(INTERACTION_ID);
    expect(result?.kind).toBe("meeting");
  });

  it("Interaction が存在しない場合に null を返す", async () => {
    state.interaction = null;

    const result = await getMeeting(INTERACTION_ID, ORG_ID);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listMeetings テスト
// ---------------------------------------------------------------------------

describe("listMeetings — 案件配下の Interaction 一覧", () => {
  it("案件配下の Interaction 一覧を返す", async () => {
    state.byDealInteractions = [
      makeInteraction({ id: "m-001" }),
      makeInteraction({ id: "m-002" }),
    ];

    const result = await listMeetings(DEAL_ID, ORG_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("m-001");
    expect(result[1].id).toBe("m-002");
  });

  it("案件配下に Interaction がない場合は空配列を返す", async () => {
    state.byDealInteractions = [];

    const result = await listMeetings(DEAL_ID, ORG_ID);

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// listMeetingsByInquiry テスト
// ---------------------------------------------------------------------------

describe("listMeetingsByInquiry — 引合配下の Interaction 一覧", () => {
  it("引合配下の Interaction 一覧を返す", async () => {
    state.byInquiryInteractions = [
      makeInteraction({ id: "m-001", dealId: null, inquiryId: INQUIRY_ID }),
    ];

    const result = await listMeetingsByInquiry(INQUIRY_ID, ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].inquiryId).toBe(INQUIRY_ID);
  });
});
