/**
 * createMeetingAction / updateMeetingAction の behavioral テスト。
 *
 * 社外参加者の解決（contactId → 氏名スナップショット）は usecase 層の責務のため、
 * action 層は「externalContactIds が usecase にそのまま渡ること」と
 * 「usecase の field 付きエラーがフィールドエラーとして返ること」を検証する。
 *
 * - externalContactIds を含む商談作成で usecase に externalContactIds が渡る。
 * - usecase が field: "externalContactIds" のエラーを返すと errors.externalContactIds になる。
 * - FormData の clientId は読まれない（usecase 引数に含まれない）。
 * - 社内参加者（internalAttendees）は MeetingAttendee[] に変換されて渡る。
 * - updateMeetingAction で externalContactIds を省略すると
 *   updateMeeting に externalContactIds: undefined が渡る（既存保持）。
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
    | { ok: false; reason: string; field?: "externalContactIds" }
    | null,
};

const updateState = {
  calls: [] as unknown[],
  returns: null as
    | { ok: true; meeting: Interaction }
    | { ok: false; reason: string; field?: "externalContactIds" }
    | null,
};

const revalidatedPaths: string[] = [];

// ---------------------------------------------------------------------------
// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
// ---------------------------------------------------------------------------

import * as createMeetingModule from "@/application/usecases/createMeeting";
import * as updateMeetingModule from "@/application/usecases/updateMeeting";

const realCreateMeeting = createMeetingModule.createMeeting;
const realUpdateMeeting = updateMeetingModule.updateMeeting;

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

mock.module("next/cache", () => ({
  revalidatePath: (path: string) => {
    revalidatedPaths.push(path);
  },
}));

afterAll(() => {
  mock.module("@/application/usecases/createMeeting", () => ({ createMeeting: realCreateMeeting }));
  mock.module("@/application/usecases/updateMeeting", () => ({ updateMeeting: realUpdateMeeting }));
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
  revalidatedPaths.length = 0;
});

// ---------------------------------------------------------------------------
// createMeetingAction — externalContactIds の usecase への委譲
// ---------------------------------------------------------------------------

describe("createMeetingAction — externalContactIds を usecase にそのまま渡す", () => {
  it("externalContactIds が createMeeting に配列のまま渡る", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeCreateFd();
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    const result = await createMeetingAction({}, fd);

    expect(result.errors).toBeUndefined();
    expect(createState.calls).toHaveLength(1);
    const args = createState.calls[0] as Record<string, unknown>;
    expect(args.externalContactIds).toEqual([CONTACT_UUID]);
  });

  it("FormData の clientId は読まれない（usecase 引数に clientId が含まれない）", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeCreateFd({ clientId: CLIENT_UUID });
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    await createMeetingAction({}, fd);

    expect(createState.calls).toHaveLength(1);
    const args = createState.calls[0] as Record<string, unknown>;
    expect("clientId" in args).toBe(false);
  });

  it("作成成功後に dealId の revalidatePath が呼ばれる", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeCreateFd();
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    await createMeetingAction({}, fd);

    expect(revalidatedPaths).toContain(`/deals/${DEAL_UUID}`);
  });
});

// ---------------------------------------------------------------------------
// createMeetingAction — usecase の field 付きエラーがフィールドエラーになる
// ---------------------------------------------------------------------------

describe("createMeetingAction — usecase の field 付きエラー", () => {
  it("field: externalContactIds のエラーが errors.externalContactIds として返る", async () => {
    createState.returns = {
      ok: false,
      reason: `未登録の担当者IDが含まれています: ${UNKNOWN_UUID}`,
      field: "externalContactIds",
    };

    const fd = makeCreateFd();
    fd.set("externalContactIds", JSON.stringify([UNKNOWN_UUID]));

    const result = await createMeetingAction({}, fd);

    expect(result.errors?.externalContactIds?.[0]).toContain("未登録の担当者ID");
    expect(result.message).toBeUndefined();
  });

  it("field なしのエラーは message として返る", async () => {
    createState.returns = { ok: false, reason: "案件が見つかりません" };

    const fd = makeCreateFd();

    const result = await createMeetingAction({}, fd);

    expect(result.message).toBe("案件が見つかりません");
    expect(result.errors).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// createMeetingAction — 社内参加者（internalAttendees）の変換
// ---------------------------------------------------------------------------

describe("createMeetingAction — 社内参加者の入力・変換が不変", () => {
  it("internalAttendees が MeetingAttendee[] に変換されて渡る", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeCreateFd();
    fd.set("internalAttendees", JSON.stringify(["社内 太郎", "社内 花子"]));

    await createMeetingAction({}, fd);

    expect(createState.calls).toHaveLength(1);
    const args = createState.calls[0] as Record<string, unknown>;
    const internal = args.internalAttendees as MeetingAttendee[];
    expect(internal).toHaveLength(2);
    expect(internal.map((a) => a.name)).toContain("社内 太郎");
    expect(internal.map((a) => a.name)).toContain("社内 花子");
    // 社内参加者は contactId なし・isExternal: false
    expect(internal.every((a) => a.contactId === null)).toBe(true);
    expect(internal.every((a) => a.isExternal === false)).toBe(true);
  });

  it("社外参加者と同時指定しても両方が独立して渡る", async () => {
    createState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeCreateFd();
    fd.set("internalAttendees", JSON.stringify(["社内 太郎"]));
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    await createMeetingAction({}, fd);

    const args = createState.calls[0] as Record<string, unknown>;
    expect((args.internalAttendees as MeetingAttendee[]).map((a) => a.name)).toContain(
      "社内 太郎"
    );
    expect(args.externalContactIds).toEqual([CONTACT_UUID]);
  });
});

// ---------------------------------------------------------------------------
// updateMeetingAction — externalContactIds の部分更新意味論
// ---------------------------------------------------------------------------

describe("updateMeetingAction — externalContactIds 省略で既存社外参加者を保持", () => {
  it("externalContactIds を省略すると updateMeeting に externalContactIds: undefined が渡る", async () => {
    updateState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeUpdateFd({ summary: "更新サマリ" });
    // externalContactIds は設定しない（省略）

    const result = await updateMeetingAction({}, fd);

    expect(result.errors).toBeUndefined();
    expect(updateState.calls).toHaveLength(1);
    const args = updateState.calls[0] as Record<string, unknown>;
    expect(args.externalContactIds).toBeUndefined();
  });

  it("externalContactIds を指定すると配列のまま updateMeeting に渡る", async () => {
    updateState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeUpdateFd();
    fd.set("externalContactIds", JSON.stringify([CONTACT_UUID]));

    await updateMeetingAction({}, fd);

    const args = updateState.calls[0] as Record<string, unknown>;
    expect(args.externalContactIds).toEqual([CONTACT_UUID]);
  });

  it("externalContactIds に空配列を指定すると空配列のまま渡る（クリア）", async () => {
    updateState.returns = { ok: true, meeting: makeMeetingInteraction() };

    const fd = makeUpdateFd();
    fd.set("externalContactIds", JSON.stringify([]));

    await updateMeetingAction({}, fd);

    const args = updateState.calls[0] as Record<string, unknown>;
    expect(args.externalContactIds).toEqual([]);
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
    // externalContactIds は undefined（既存を保持）
    expect(args.externalContactIds).toBeUndefined();
  });

  it("usecase の field 付きエラーが errors.externalContactIds として返る", async () => {
    updateState.returns = {
      ok: false,
      reason: `未登録の担当者IDが含まれています: ${UNKNOWN_UUID}`,
      field: "externalContactIds",
    };

    const fd = makeUpdateFd();
    fd.set("externalContactIds", JSON.stringify([UNKNOWN_UUID]));

    const result = await updateMeetingAction({}, fd);

    expect(result.errors?.externalContactIds?.[0]).toContain("未登録の担当者ID");
    expect(result.message).toBeUndefined();
  });
});
