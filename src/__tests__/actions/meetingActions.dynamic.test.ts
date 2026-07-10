/**
 * createMeetingAction / updateMeetingAction の behavioral テスト。
 *
 * - TC-001: 社外参加者（externalContactIds）を含む商談作成が成功し、
 *   attendees に contactId と氏名スナップショットが保存される。
 * - TC-002: 未登録 contactId を指定するとバリデーションエラーになる。
 * - TC-003: clientId なしで社外参加者を指定するとバリデーションエラーになる。
 * - TC-005: 社内参加者（internalAttendees）の入力・保存が不変。
 * - TC-008: updateMeetingAction で externalContactIds を省略すると
 *   updateMeeting に externalAttendees: undefined が渡される（既存保持）。
 */

import { describe, it, expect, beforeEach, mock, afterAll } from "bun:test";
import type { Interaction, MeetingAttendee } from "@/domain/models/interaction";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const authState = {
  userId: "user-admin" as string | null,
  role: "admin" as string,
  orgId: "org-001",
};

const createState = {
  calls: [] as unknown[],
  returns: null as
    | { ok: true; meeting: Interaction }
    | { ok: false; reason: string }
    | null,
};

const updateState = {
  calls: [] as unknown[],
  returns: null as
    | { ok: true; meeting: Interaction }
    | { ok: false; reason: string }
    | null,
};

const listContactsState = {
  callCount: 0,
  contacts: [] as Array<{ id: string; name: string }>,
};

const revalidatedPaths: string[] = [];

// ---------------------------------------------------------------------------
// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
// ---------------------------------------------------------------------------

import * as createMeetingModule from "@/application/usecases/createMeeting";
import * as updateMeetingModule from "@/application/usecases/updateMeeting";
import * as listClientContactsModule from "@/application/usecases/listClientContacts";

const realCreateMeeting = createMeetingModule.createMeeting;
const realUpdateMeeting = updateMeetingModule.updateMeeting;
const realListClientContacts = listClientContactsModule.listClientContacts;

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/auth", () => ({
  auth: async () => {
    if (!authState.userId) return null;
    return {
      user: {
        id: authState.userId,
        organizationId: authState.orgId,
        role: authState.role,
      },
    };
  },
}));

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: { createRequest: { limit: 100, windowMs: 60_000 } },
}));

mock.module("@/application/usecases/createMeeting", () => ({
  createMeeting: async (input: unknown) => {
    createState.calls.push(input);
    return (
      createState.returns ?? { ok: false as const, reason: "mock not configured" }
    );
  },
}));

mock.module("@/application/usecases/updateMeeting", () => ({
  updateMeeting: async (input: unknown) => {
    updateState.calls.push(input);
    return (
      updateState.returns ?? { ok: false as const, reason: "mock not configured" }
    );
  },
}));

mock.module("@/application/usecases/listClientContacts", () => ({
  listClientContacts: async (...args: unknown[]) => {
    listContactsState.callCount++;
    void args;
    return listContactsState.contacts;
  },
}));

mock.module("next/cache", () => ({
  revalidatePath: (path: string) => {
    revalidatedPaths.push(path);
  },
}));

afterAll(() => {
  mock.module("@/application/usecases/createMeeting", () => ({ createMeeting: realCreateMeeting }));
  mock.module("@/application/usecases/updateMeeting", () => ({ updateMeeting: realUpdateMeeting }));
  mock.module("@/application/usecases/listClientContacts", () => ({
    listClientContacts: realListClientContacts,
  }));
});

import { createMeetingAction, updateMeetingAction } from "@/app/actions/meetings";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const CLIENT_UUID = "bbbbbbbb-e89b-12d3-a456-426614174001";
const CONTACT_UUID = "aaaaaaaa-e89b-12d3-a456-426614174001";
const MEETING_UUID = "123e4567-e89b-12d3-a456-426614174002";
const UNKNOWN_UUID = "cccccccc-e89b-12d3-a456-426614174001";

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function makeMeetingInteraction(): Interaction {
  return {
    id: MEETING_UUID,
    organizationId: "org-001",
    kind: "meeting",
    dealId: DEAL_UUID,
    inquiryId: null,
    contractId: null,
    invoiceId: null,
    clientId: null,
    meetingType: "hearing",
    date: new Date("2026-01-01"),
    location: null,
    attendees: [],
    summary: null,
    actionItems: [],
    details: null,
    createdById: "user-admin",
    version: 1,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function makeCreateFd(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("dealId", DEAL_UUID);
  fd.set("type", "hearing");
  fd.set("date", "2026-01-01T00:00:00Z");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

function makeUpdateFd(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("meetingId", MEETING_UUID);
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  authState.userId = "user-admin";
  authState.role = "admin";
  authState.orgId = "org-001";
  createState.calls = [];
  createState.returns = null;
  updateState.calls = [];
  updateState.returns = null;
  listContactsState.callCount = 0;
  listContactsState.contacts = [];
  revalidatedPaths.length = 0;
});

// ---------------------------------------------------------------------------
// TC-001: contactId 指定の社外参加者を含む商談作成が成功し、氏名スナップショットが保存される
// ---------------------------------------------------------------------------

describe("TC-001: createMeetingAction — externalContactIds 指定・氏名スナップショット", () => {
  it("登録済み contactId の社外参加者が attendees に contactId と氏名で保存される", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };
    listContactsState.contacts = [{ id: CONTACT_UUID, name: "山田 花子" }];

    const fd = makeCreateFd({ clientId: CLIENT_UUID });
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    const result = await createMeetingAction({}, fd);

    expect(result.errors).toBeUndefined();
    expect(createState.calls).toHaveLength(1);
    const args = createState.calls[0] as Record<string, unknown>;
    const attendees = args.attendees as MeetingAttendee[];
    const external = attendees.filter((a) => a.isExternal);
    expect(external).toHaveLength(1);
    expect(external[0].contactId).toBe(CONTACT_UUID);
    expect(external[0].name).toBe("山田 花子");
    expect(external[0].isExternal).toBe(true);
  });

  it("作成成功後に dealId の revalidatePath が呼ばれる", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };
    listContactsState.contacts = [{ id: CONTACT_UUID, name: "山田 花子" }];

    const fd = makeCreateFd({ clientId: CLIENT_UUID });
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    await createMeetingAction({}, fd);

    expect(revalidatedPaths).toContain(`/deals/${DEAL_UUID}`);
  });
});

// ---------------------------------------------------------------------------
// TC-002: 未登録 contactId を指定するとバリデーションエラー
// ---------------------------------------------------------------------------

describe("TC-002: createMeetingAction — 未登録 contactId はバリデーションエラー", () => {
  it("未登録の contactId を指定するとエラーが返り createMeeting が呼ばれない", async () => {
    listContactsState.contacts = []; // 担当者リストは空（UNKNOWN_UUID は存在しない）

    const fd = makeCreateFd({ clientId: CLIENT_UUID });
    fd.set("externalContactIds", JSON.stringify([UNKNOWN_UUID]));

    const result = await createMeetingAction({}, fd);

    expect(result.errors?.externalContactIds).toBeDefined();
    expect(createState.calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-003: clientId なしで社外参加者を指定するとバリデーションエラー
// ---------------------------------------------------------------------------

describe("TC-003: createMeetingAction — clientId なし・社外参加者指定はバリデーションエラー", () => {
  it("clientId が未設定のまま externalContactIds を指定するとエラーが返る", async () => {
    const fd = makeCreateFd(); // clientId なし
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    const result = await createMeetingAction({}, fd);

    expect(result.errors?.externalContactIds).toBeDefined();
    expect(createState.calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-005: 社内参加者（internalAttendees）の入力・保存が不変
// ---------------------------------------------------------------------------

describe("TC-005: createMeetingAction — 社内参加者の入力・保存が不変", () => {
  it("internalAttendees が attendees の社内参加者として保存される", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeCreateFd();
    fd.set("internalAttendees", JSON.stringify(["社内 太郎", "社内 花子"]));

    await createMeetingAction({}, fd);

    expect(createState.calls).toHaveLength(1);
    const args = createState.calls[0] as Record<string, unknown>;
    const attendees = args.attendees as MeetingAttendee[];
    const internal = attendees.filter((a) => !a.isExternal);
    expect(internal).toHaveLength(2);
    expect(internal.map((a) => a.name)).toContain("社内 太郎");
    expect(internal.map((a) => a.name)).toContain("社内 花子");
    // 社内参加者は contactId なし
    expect(internal.every((a) => a.contactId === null)).toBe(true);
    expect(internal.every((a) => a.isExternal === false)).toBe(true);
  });

  it("社外参加者と同時指定しても社内参加者が保持される", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };
    listContactsState.contacts = [{ id: CONTACT_UUID, name: "外部 担当" }];

    const fd = makeCreateFd({ clientId: CLIENT_UUID });
    fd.set("internalAttendees", JSON.stringify(["社内 太郎"]));
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    await createMeetingAction({}, fd);

    const args = createState.calls[0] as Record<string, unknown>;
    const attendees = args.attendees as MeetingAttendee[];
    expect(attendees.filter((a) => !a.isExternal).map((a) => a.name)).toContain("社内 太郎");
    expect(attendees.filter((a) => a.isExternal).map((a) => a.name)).toContain("外部 担当");
  });
});

// ---------------------------------------------------------------------------
// TC-008: updateMeetingAction — externalContactIds 省略で既存社外参加者を保持
// ---------------------------------------------------------------------------

describe("TC-008: updateMeetingAction — externalContactIds 省略で既存社外参加者を保持", () => {
  it("externalContactIds を省略すると updateMeeting に externalAttendees: undefined が渡る", async () => {
    updateState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeUpdateFd({ summary: "更新サマリ" });
    // externalContactIds は設定しない（省略）

    const result = await updateMeetingAction({}, fd);

    expect(result.errors).toBeUndefined();
    expect(updateState.calls).toHaveLength(1);
    const args = updateState.calls[0] as Record<string, unknown>;
    expect(args.externalAttendees).toBeUndefined();
  });

  it("externalContactIds 省略時は listClientContacts が呼ばれない", async () => {
    updateState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeUpdateFd({ summary: "更新サマリ" });
    // externalContactIds は設定しない（省略）

    await updateMeetingAction({}, fd);

    expect(listContactsState.callCount).toBe(0);
  });

  it("internalAttendees のみ指定・externalContactIds 省略 → 社外参加者は保持", async () => {
    updateState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeUpdateFd();
    fd.set("internalAttendees", JSON.stringify(["新社内参加者"]));
    // externalContactIds は設定しない（省略）

    await updateMeetingAction({}, fd);

    const args = updateState.calls[0] as Record<string, unknown>;
    expect(Array.isArray(args.internalAttendees)).toBe(true);
    expect((args.internalAttendees as MeetingAttendee[]).map((a) => a.name)).toContain(
      "新社内参加者"
    );
    // externalAttendees は undefined（既存を保持）
    expect(args.externalAttendees).toBeUndefined();
  });
});
