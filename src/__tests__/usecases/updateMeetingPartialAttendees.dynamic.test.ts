/**
 * updateMeeting usecase — attendees 部分更新と社外参加者解決のロジック検証。
 *
 * - internalAttendees のみ指定 → 既存の社外参加者を保持して attendees を構築する
 * - externalContactIds のみ指定 → 既存の社内参加者を保持し、担当者マスタで解決して差し替える
 * - 両方指定 → 全差し替え
 * - 両方省略 → attendees 変更なし
 * - internalAttendees: []（空配列）→ 社内側クリア、社外側は保持
 * - externalContactIds: null / [] → 社外側クリア、社内側は保持
 * - 未登録 ID → field: "externalContactIds" 付きエラー
 * - 懸垂参照の温存:
 *   - 社内参加者のみ更新時、担当者マスタから消えた contactId の社外参加者が
 *     氏名スナップショットごと温存される
 *   - 社外側を明示更新しても、維持指定した懸垂 ID のエントリは温存される
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
  deal: null as { clientId: string } | null,
  inquiry: null as { clientId: string | null } | null,
  contacts: [] as Array<{ id: string; name: string }>,
  findContactsCallCount: 0,
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
  dealRepository: {
    findById: async () => state.deal,
  },
  inquiryRepository: {
    findById: async () => state.inquiry,
  },
  clientRepository: {
    findContactsByClientId: async () => {
      state.findContactsCallCount++;
      return state.contacts;
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
const CLIENT_ID = "client-001";
const CONTACT_B = "contact-b";
const CONTACT_C = "contact-c";
const DELETED_CONTACT = "contact-deleted";
const UNKNOWN_CONTACT = "contact-unknown";

const INTERNAL_A: MeetingAttendee = {
  userId: null,
  contactId: null,
  name: "内部A",
  isExternal: false,
};
const INTERNAL_C: MeetingAttendee = {
  userId: null,
  contactId: null,
  name: "内部C",
  isExternal: false,
};
const EXTERNAL_B: MeetingAttendee = {
  userId: null,
  contactId: CONTACT_B,
  name: "外部B",
  isExternal: true,
};
const EXTERNAL_DELETED: MeetingAttendee = {
  userId: null,
  contactId: DELETED_CONTACT,
  name: "削除済 担当者",
  isExternal: true,
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
  state.deal = { clientId: CLIENT_ID };
  state.inquiry = null;
  state.contacts = [];
  state.findContactsCallCount = 0;
  state.updateArgs = null;
  state.auditCalls = [];
});

// ---------------------------------------------------------------------------
// 部分更新マージロジック
// ---------------------------------------------------------------------------

describe("updateMeeting — internalAttendees / externalContactIds 部分更新マージロジック", () => {
  it("internalAttendees のみ指定 → 既存の社外参加者を保持して attendees を構築する", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [INTERNAL_C],
      // externalContactIds は省略（既存の社外参加者を保持）
    });

    expect(result.ok).toBe(true);
    expect(state.updateArgs).not.toBeNull();
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees).toHaveLength(2);
    // 社内側: 新しい内部C（既存の内部Aは差し替えられる）
    const internalAttendees = updatedAttendees.filter((a) => !a.isExternal);
    expect(internalAttendees).toHaveLength(1);
    expect(internalAttendees[0].name).toBe("内部C");
    // 社外側: 既存の外部Bが保持される
    const externalAttendees = updatedAttendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].name).toBe("外部B");
    expect(externalAttendees[0].contactId).toBe(CONTACT_B);
  });

  it("externalContactIds のみ指定 → 既存の社内参加者を保持し、担当者マスタで解決して差し替える", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);
    state.contacts = [{ id: CONTACT_C, name: "外部C" }];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalContactIds: [CONTACT_C],
      // internalAttendees は省略（既存の社内参加者を保持）
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees).toHaveLength(2);
    // 社内側: 既存の内部Aが保持される
    const internalAttendees = updatedAttendees.filter((a) => !a.isExternal);
    expect(internalAttendees).toHaveLength(1);
    expect(internalAttendees[0].name).toBe("内部A");
    // 社外側: 担当者マスタの氏名で解決された外部C（既存の外部Bは差し替えられる）
    const externalAttendees = updatedAttendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].contactId).toBe(CONTACT_C);
    expect(externalAttendees[0].name).toBe("外部C");
  });

  it("両方指定 → 全差し替え（既存の参加者は使われない）", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);
    state.contacts = [{ id: CONTACT_C, name: "外部C" }];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [INTERNAL_C],
      externalContactIds: [CONTACT_C],
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees).toHaveLength(2);
    const names = updatedAttendees.map((a) => a.name);
    expect(names).toContain("内部C");
    expect(names).toContain("外部C");
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
      // internalAttendees も externalContactIds も省略
    });

    expect(result.ok).toBe(true);
    // attendees が update に渡されないことを確認
    expect(state.updateArgs!.data.attendees).toBeUndefined();
    // 担当者マスタも参照されない
    expect(state.findContactsCallCount).toBe(0);
  });

  it("internalAttendees: []（空配列）→ 社内側クリア、社外側は保持", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [], // 社内参加者をクリア
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    // 社内参加者はクリア（0件）
    expect(updatedAttendees.filter((a) => !a.isExternal)).toHaveLength(0);
    // 社外参加者は保持（1件）
    const externalAttendees = updatedAttendees.filter((a) => a.isExternal);
    expect(externalAttendees).toHaveLength(1);
    expect(externalAttendees[0].name).toBe("外部B");
  });

  it("externalContactIds: null → 社外側クリア、社内側は保持", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalContactIds: null,
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees.filter((a) => a.isExternal)).toHaveLength(0);
    const internalAttendees = updatedAttendees.filter((a) => !a.isExternal);
    expect(internalAttendees).toHaveLength(1);
    expect(internalAttendees[0].name).toBe("内部A");
  });

  it("externalContactIds: []（空配列）→ 社外側クリア、社内側は保持", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalContactIds: [],
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees.filter((a) => a.isExternal)).toHaveLength(0);
    expect(updatedAttendees.filter((a) => !a.isExternal)).toHaveLength(1);
    // クリア時は担当者マスタを参照しない
    expect(state.findContactsCallCount).toBe(0);
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

// ---------------------------------------------------------------------------
// 社外参加者の解決（clientId 導出・未登録エラー）
// ---------------------------------------------------------------------------

describe("updateMeeting — 社外参加者の解決", () => {
  it("既存 interaction の dealId から clientId を導出して担当者を解決する", async () => {
    state.existingMeeting = makeMeeting([]);
    state.deal = { clientId: CLIENT_ID };
    state.contacts = [{ id: CONTACT_C, name: "外部C" }];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalContactIds: [CONTACT_C],
    });

    expect(result.ok).toBe(true);
    expect(state.findContactsCallCount).toBe(1);
  });

  it("dealId がなく inquiryId がある場合は inquiry の clientId から解決する", async () => {
    state.existingMeeting = {
      ...makeMeeting([]),
      dealId: null,
      inquiryId: "inquiry-001",
    };
    state.inquiry = { clientId: CLIENT_ID };
    state.contacts = [{ id: CONTACT_C, name: "外部C" }];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalContactIds: [CONTACT_C],
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    expect(updatedAttendees.filter((a) => a.isExternal)).toHaveLength(1);
  });

  it("未登録 ID（既存 attendees にも無い）→ field: externalContactIds 付きエラー", async () => {
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_B]);
    state.contacts = [{ id: CONTACT_B, name: "外部B" }];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalContactIds: [CONTACT_B, UNKNOWN_CONTACT],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("未登録の担当者ID");
      expect(result.reason).toContain(UNKNOWN_CONTACT);
      expect(result.field).toBe("externalContactIds");
    }
    // エラー時は update が呼ばれない
    expect(state.updateArgs).toBeNull();
  });

  it("担当者マスタの氏名で解決される（渡した ID の順序を保つ）", async () => {
    state.existingMeeting = makeMeeting([]);
    state.contacts = [
      { id: CONTACT_B, name: "外部B" },
      { id: CONTACT_C, name: "外部C" },
    ];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      externalContactIds: [CONTACT_C, CONTACT_B],
    });

    expect(result.ok).toBe(true);
    const external = (state.updateArgs!.data.attendees as MeetingAttendee[]).filter(
      (a) => a.isExternal
    );
    expect(external.map((a) => a.contactId)).toEqual([CONTACT_C, CONTACT_B]);
    expect(external.map((a) => a.name)).toEqual(["外部C", "外部B"]);
  });
});

// ---------------------------------------------------------------------------
// 懸垂参照（担当者マスタから削除された contactId）の温存
// ---------------------------------------------------------------------------

describe("updateMeeting — 削除済み担当者の氏名スナップショット温存", () => {
  it("既存の contactId が担当者マスタから消えた状態で社内参加者のみ更新 → 社外側が氏名スナップショットごと温存される", async () => {
    // EXTERNAL_DELETED の contactId は担当者マスタに存在しない
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_DELETED]);
    state.contacts = [];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      internalAttendees: [INTERNAL_C],
      // externalContactIds は省略（社外側は保持）
    });

    expect(result.ok).toBe(true);
    const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
    const external = updatedAttendees.filter((a) => a.isExternal);
    expect(external).toHaveLength(1);
    expect(external[0].contactId).toBe(DELETED_CONTACT);
    expect(external[0].name).toBe("削除済 担当者");
    // 社外側を触らない更新では担当者マスタを参照しない
    expect(state.findContactsCallCount).toBe(0);
  });

  it("社外側を明示更新しても、維持指定した懸垂 ID のエントリ（氏名スナップショット）は温存される", async () => {
    // 既存: 懸垂参照 EXTERNAL_DELETED と登録済み EXTERNAL_B
    state.existingMeeting = makeMeeting([INTERNAL_A, EXTERNAL_DELETED, EXTERNAL_B]);
    // マスタには CONTACT_B と CONTACT_C のみ（DELETED_CONTACT は削除済み）
    state.contacts = [
      { id: CONTACT_B, name: "外部B" },
      { id: CONTACT_C, name: "外部C" },
    ];

    const result = await updateMeeting({
      meetingId: MEETING_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      // 懸垂 ID を維持しつつ CONTACT_C を追加、CONTACT_B は除外
      externalContactIds: [DELETED_CONTACT, CONTACT_C],
    });

    expect(result.ok).toBe(true);
    const external = (state.updateArgs!.data.attendees as MeetingAttendee[]).filter(
      (a) => a.isExternal
    );
    expect(external).toHaveLength(2);
    // 懸垂 ID は既存エントリの氏名スナップショットのまま温存される
    const dangling = external.find((a) => a.contactId === DELETED_CONTACT);
    expect(dangling).toBeDefined();
    expect(dangling!.name).toBe("削除済 担当者");
    // 登録済み ID はマスタの氏名で解決される
    const added = external.find((a) => a.contactId === CONTACT_C);
    expect(added).toBeDefined();
    expect(added!.name).toBe("外部C");
    // 除外された CONTACT_B は含まれない
    expect(external.some((a) => a.contactId === CONTACT_B)).toBe(false);
  });
});
