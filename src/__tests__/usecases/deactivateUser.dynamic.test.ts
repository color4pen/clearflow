/**
 * deactivateUser usecase の動的テスト。
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
  orgUsers: [] as User[],
  deactivatedUser: null as User | null,
  deactivateArgs: null as { id: string; orgId: string } | null,
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
  findByOrganization: async (_orgId: string) => state.orgUsers,
  deactivate: async (id: string, orgId: string, _tx?: unknown) => {
    state.deactivateArgs = { id, orgId };
    if (!state.deactivatedUser) throw new Error("deactivatedUser not set");
    return state.deactivatedUser;
  },
  existsByEmail: async () => false,
  create: async () => null,
  findByEmailForAuth: async () => null,
  findByIdForAuth: async () => null,
  updateRole: async () => null,
  updateProfile: async () => null,
  updatePassword: async () => false,
  updateNotificationsLastSeenAt: async () => {},
  reactivate: async () => null,
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

import { deactivateUser } from "@/application/usecases/deactivateUser";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ACTOR_ID = "actor-001";
const TARGET_ID = "target-001";
const OTHER_ADMIN_ID = "other-admin-001";
const ORG_ID = "org-001";

const adminUser: User = {
  id: TARGET_ID,
  email: "target@example.com",
  name: "Target Admin",
  organizationId: ORG_ID,
  role: "admin",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

const memberUser: User = {
  id: TARGET_ID,
  email: "target@example.com",
  name: "Target Member",
  organizationId: ORG_ID,
  role: "member",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

const otherActiveAdmin: User = {
  id: OTHER_ADMIN_ID,
  email: "other-admin@example.com",
  name: "Other Admin",
  organizationId: ORG_ID,
  role: "admin",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

const deactivatedAdminResult: User = {
  ...adminUser,
  deactivatedAt: new Date("2026-06-29"),
};

const deactivatedMemberResult: User = {
  ...memberUser,
  deactivatedAt: new Date("2026-06-29"),
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("deactivateUser usecase", () => {
  beforeEach(() => {
    state.foundUser = null;
    state.orgUsers = [];
    state.deactivatedUser = null;
    state.deactivateArgs = null;
    state.auditCreateArgs = null;
  });

  it("自己無効化拒否: actorId === targetUserId のとき { ok: false } が返る", async () => {
    const result = await deactivateUser({
      actorId: TARGET_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("自分自身は無効化できません");
    }
    expect(state.deactivateArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });

  it("最後の有効 admin 無効化拒否: 他に有効な admin がいないとき { ok: false } が返る", async () => {
    // 対象ユーザーは admin、組織内に他の有効な admin なし
    state.foundUser = adminUser;
    state.orgUsers = [adminUser]; // 他の admin なし

    const result = await deactivateUser({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("管理者");
    }
    expect(state.deactivateArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });

  it("member 無効化成功: { ok: true } が返り、deactivate が呼ばれ、audit が action='user.deactivate' で記録される", async () => {
    // 対象は member — admin チェックはスキップされる
    state.foundUser = memberUser;
    state.deactivatedUser = deactivatedMemberResult;

    const result = await deactivateUser({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(true);

    // deactivate が正しい引数で呼ばれたことを assert
    expect(state.deactivateArgs).not.toBeNull();
    expect(state.deactivateArgs?.id).toBe(TARGET_ID);
    expect(state.deactivateArgs?.orgId).toBe(ORG_ID);

    // 監査ログが正しく記録されたことを assert
    expect(state.auditCreateArgs).not.toBeNull();
    expect(state.auditCreateArgs?.action).toBe("user.deactivate");
    expect(state.auditCreateArgs?.targetType).toBe("user");
    expect(state.auditCreateArgs?.targetId).toBe(TARGET_ID);
    expect(state.auditCreateArgs?.actorId).toBe(ACTOR_ID);
    expect(state.auditCreateArgs?.organizationId).toBe(ORG_ID);
  });

  it("admin 無効化成功: 他に有効な admin がいれば { ok: true } が返り、deactivate と audit が呼ばれる", async () => {
    // 対象は admin だが、他にも有効な admin が存在する
    state.foundUser = adminUser;
    state.orgUsers = [adminUser, otherActiveAdmin];
    state.deactivatedUser = deactivatedAdminResult;

    const result = await deactivateUser({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(true);
    expect(state.deactivateArgs?.id).toBe(TARGET_ID);
    expect(state.auditCreateArgs?.action).toBe("user.deactivate");
  });

  it("対象ユーザーが見つからない場合: findById が null を返すとき { ok: false } が返る", async () => {
    state.foundUser = null;

    const result = await deactivateUser({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
    });

    expect(result.ok).toBe(false);
    expect(state.deactivateArgs).toBeNull();
  });
});
