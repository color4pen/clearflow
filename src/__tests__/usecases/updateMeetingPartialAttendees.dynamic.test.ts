/**
 * updateMeeting usecase — attendees 部分更新のロジック検証。
 *
 * T-06 usecase 層テスト:
 * - internalAttendees のみ指定 → 既存の外部参加者を保持して attendees を構築する
 * - externalAttendees のみ指定 → 既存の内部参加者を保持して attendees を構築する
 * - 両方指定 → 全差し替え
 * - 両方省略 → attendees 変更なし
 * - internalAttendees: []（空配列）→ 内部側クリア、外部側は保持
 *
 * repository mock は findById が既存 attendees を返し、update に渡された attendees を検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Interaction, MeetingAttendee } from "@/domain/models/interaction";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  existingMeeting: null as Interaction | null,
  updateArgs: null as {
    id: string;
    orgId: string;
    data: Record<string, unknown>;
    version: number;
  } | null,
  auditCalls: [] as unknown[],
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories", () => ({
  interactionRepository: {
    findById: async () => state.existingMeeting,
    update: async (
      id: string,
      orgId: string,
      data: Record<string, unknown>,
      version: number
    ) => {
      state.updateArgs = { id, orgId, data, version };
      // update が呼ばれたら existingMeeting を返す（attendees は data から取得）
      if (!state.existingMeeting) return null;
      return {
        ...state.existingMeeting,
        attendees: (data.attendees ?? state.existingMeeting.attendees) as MeetingAttendee[],
      };
    },
  },
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (data: unknown) => {
    state.auditCalls.push(data);
  },
}));

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { updateMeeting } from "@/application/usecases/updateMeeting";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ORG = "org-1";
const MEETING_ID = "meeting-001";
const ACTOR_ID = "actor-001";

const INTERNAL_A: MeetingAttendee = {
  userId: null,
  contactId: null,
  name: "内部A",
  isExternal: false,
};
const INTERNAL_B: MeetingAttendee = {
  userId: null,
  contactId: null,
  name: "内部B",
  isExternal: false,
};
const EXTERNAL_B: MeetingAttendee = {
  userId: null,
  contactId: null,
  name: "外部B",
  isExternal: true,
};
const EXTERNAL_C: MeetingAttendee = {
  userId: null,
  contactId: null,
  name: "外部C",
  isExternal: true,
};
const INTERNAL_C: MeetingAttendee = {
  userId: null,
  contactId: null,
  name: "内部C",
  isExternal: false,
};

function makeMeeting(attendees: MeetingAttendee[]): Interaction {
  return {
    id: MEETING_ID,
    organizationId: ORG,
    kind: "meeting",
    dealId: "deal-001",
    inquiryId: null,
    contractId: null,
    invoiceId: null,
    clientId: null,
    meetingType: "hearing",
    date: new Date("2026-01-01"),
    location: null,
    attendees,
    summary: "テスト商談",
    preparation: null,
    actionItems: [],
    details: null,
    createdById: ACTOR_ID,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
  };
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.existingMeeting = null;
  state.updateArgs = null;
  state.auditCalls = [];
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック", () => {
  it("internalAttendees のみ指定 → 既存の外部参加者を保持して attendees を構築する", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [INTERNAL_C],
      // externalAttendees は省略（既存の外部参加者を保持）
    });

    expect(result.ok).toBe(true);
    expect(state.updateArgs).not.toBeNull();
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees).toHaveLength(2);
    // 内部側: 新しい内部C（既存の内部Aは差し替えられる）
    const internalAttendees = updatedAttendees.filter((a) => !a.isExternal);
    expect(internalAttendees).toHaveLength(1);
    expect(internalAttendees[0].name).toBe("内部C");
    // 外部側: 既存の外部Bが保持される
    const externalAttendees = updatedAttendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].name).toBe("外部B");
  });

  it("externalAttendees のみ指定 → 既存の内部参加者を保持して attendees を構築する", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalAttendees: [EXTERNAL_C],
      // internalAttendees は省略（既存の内部参加者を保持）
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees).toHaveLength(2);
    // 内部側: 既存の内部Aが保持される
    const internalAttendees = updatedAttendees.filter((a) => !a.isExternal);
    expect(internalAttendees).toHaveLength(1);
    expect(internalAttendees[0].name).toBe("内部A");
    // 外部側: 新しい外部C（既存の外部Bは差し替えられる）
    const externalAttendees = updatedAttendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].name).toBe("外部C");
  });

  it("両方指定 → 全差し替え（既存の参加者は使われない）", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [INTERNAL_B, INTERNAL_C],
      externalAttendees: [EXTERNAL_C],
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees).toHaveLength(3);
    const internalAttendees = updatedAttendees.filter((a) => !a.isExternal);
    expect(internalAttendees).toHaveLength(2);
    expect(internalAttendees.map((a) => a.name)).toContain("内部B");
    expect(internalAttendees.map((a) => a.name)).toContain("内部C");
    const externalAttendees = updatedAttendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].name).toBe("外部C");
    // 既存のA, Bは使われない
    const names = updatedAttendees.map((a) => a.name);
    expect(names).not.toContain("内部A");
    expect(names).not.toContain("外部B");
  });

  it("両方省略 → attendees は変更されない（update に attendees が渡らない）", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      summary: "新サマリ",
      // internalAttendees も externalAttendees も attendees も省略
    });

    expect(result.ok).toBe(true);
    // attendees が update に渡されないことを確認
    expect(state.updateArgs!.data.attendees).toBeUndefined();
  });

  it("internalAttendees: []（空配列）→ 内部側クリア、外部側は保持", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [], // 内部参加者をクリア
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    // 内部参加者はクリア（0件）
    const internalAttendees = updatedAttendees.filter((a) => !a.isExternal);
    expect(internalAttendees).toHaveLength(0);
    // 外部参加者は保持（1件）
    const externalAttendees = updatedAttendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].name).toBe("外部B");
  });

  it("後方互換: attendees が直接指定された場合（Server Action）は全置換される", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const newAttendees: MeetingAttendee[] = [INTERNAL_C];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      attendees: newAttendees, // 後方互換の全置換
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees).toHaveLength(1);
    expect(updatedAttendees[0].name).toBe("内部C");
  });

  it("internalAttendees / externalAttendees と attendees が同時指定 → 前者を優先する", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [INTERNAL_C], // 優先される
      attendees: [INTERNAL_A, EXTERNAL_B], // 無視される
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    // internalAttendees が優先され、externalAttendees は既存から保持
    const internal = updatedAttendees.filter((a) => !a.isExternal);
    expect(internal).toHaveLength(1);
    expect(internal[0].name).toBe("内部C");
    const external = updatedAttendees.filter((a) => a.isExternal);
    expect(external).toHaveLength(1);
    expect(external[0].name).toBe("外部B"); // 既存から保持
  });

  it("存在しない商談は ok:false を返す", async () => {
    state.existingMeeting = null;

    const result = await updateMeeting({
      meetingId: "non-existent",
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [INTERNAL_C],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("商談が見つかりません");
    }
  });
});
