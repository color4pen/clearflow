/**
 * reactivateUser usecase の動的テスト。
 * 個別ファイルモックを使ってビジネスロジックを検証する。
 * バレル（@/infrastructure/repositories）はモックせず、個別ファイルをモックして
 * 他テストファイルとのモック汚染を防ぐ。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { User } from "@/domain/models/user";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  foundUser: null as User | null,
  reactivatedUser: null as User | null,
  reactivateArgs: null as { id: string; orgId: string } | null,
  auditCreateArgs: null as Record<string, unknown> | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（個別ファイル — バレルは使わない）
// ---------------------------------------------------------------------------

// DB: transaction を即時実行するモック
mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      await fn({});
    },
  },
}));

// userRepository の個別ファイルモック
mock.module("@/infrastructure/repositories/userRepository", () => ({
  findById: async (_id: string, _orgId: string) => state.foundUser,
  reactivate: async (id: string, orgId: string, _tx?: unknown) => {
    state.reactivateArgs = { id, orgId };
    if (!state.reactivatedUser) throw new Error("reactivatedUser not set");
    return state.reactivatedUser;
  },
  existsByEmail: async () => false,
  create: async () => null,
  findByEmailForAuth: async () => null,
  findByIdForAuth: async () => null,
  findByOrganization: async () => [],
  updateRole: async () => null,
  updateProfile: async () => null,
  updatePassword: async () => false,
  updateNotificationsLastSeenAt: async () => {},
  deactivate: async () => null,
}));

// auditRecorder のモック
// バレル経由の干渉を避けるため service 層を直接モック。
// 他のテストファイルが auditLogRepository.create を経由して state を更新する場合も
// 引き続き機能するよう、バレルの auditLogRepository.create に pass-through する。
mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (data: Record<string, unknown>, tx?: unknown) => {
    state.auditCreateArgs = data;
    try {
      const repos = await import("@/infrastructure/repositories");
      if (repos?.auditLogRepository && typeof (repos.auditLogRepository as Record<string, unknown>).create === "function") {
        return await (repos.auditLogRepository as { create: (data: Record<string, unknown>, tx?: unknown) => Promise<unknown> }).create({
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: (data.metadata ?? null),
        }, tx);
      }
    } catch {
      // DB 未接続や未モック時のエラーは無視して fallback を返す
    }
    return { id: "audit-001", ...data, createdAt: new Date() };
  },
}));

import { reactivateUser } from "@/application/usecases/reactivateUser";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ACTOR_ID = "actor-001";
const TARGET_ID = "target-001";
const ORG_ID = "org-001";

const deactivatedUser: User = {
  id: TARGET_ID,
  email: "target@example.com",
  name: "Target User",
  organizationId: ORG_ID,
  role: "member",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: new Date("2026-05-01"),
};

const activeUser: User = {
  id: TARGET_ID,
  email: "target@example.com",
  name: "Target User",
  organizationId: ORG_ID,
  role: "member",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

const reactivatedResult: User = {
  ...deactivatedUser,
  deactivatedAt: null,
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("reactivateUser usecase", () => {
  beforeEach(() => {
    state.foundUser = null;
    state.reactivatedUser = null;
    state.reactivateArgs = null;
    state.auditCreateArgs = null;
  });

  it("再有効化成功: 無効化済みユーザーに対して { ok: true } が返り、reactivate と audit が呼ばれる", async () => {
    state.foundUser = deactivatedUser;
    state.reactivatedUser = reactivatedResult;

    const result = await reactivateUser({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(true);

    // reactivate が正しい引数で呼ばれたことを assert
    expect(state.reactivateArgs).not.toBeNull();
    expect(state.reactivateArgs?.id).toBe(TARGET_ID);
    expect(state.reactivateArgs?.orgId).toBe(ORG_ID);

    // 監査ログが正しく記録されたことを assert
    expect(state.auditCreateArgs).not.toBeNull();
    expect(state.auditCreateArgs?.action).toBe("user.reactivate");
    expect(state.auditCreateArgs?.targetType).toBe("user");
    expect(state.auditCreateArgs?.targetId).toBe(TARGET_ID);
    expect(state.auditCreateArgs?.actorId).toBe(ACTOR_ID);
    expect(state.auditCreateArgs?.organizationId).toBe(ORG_ID);
  });

  it("既に有効なユーザーへの再有効化拒否: deactivatedAt === null のとき { ok: false } が返り、reactivate は呼ばれない", async () => {
    state.foundUser = activeUser;

    const result = await reactivateUser({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("すでに有効");
    }
    expect(state.reactivateArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });

  it("対象ユーザーが見つからない場合: findById が null を返すとき { ok: false } が返る", async () => {
    state.foundUser = null;

    const result = await reactivateUser({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(false);
    expect(state.reactivateArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });
});
