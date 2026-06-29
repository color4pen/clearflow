/**
 * updateUserRole usecase の動的テスト。
 * 個別ファイルモックを使ってビジネスロジックを検証する。
 * バレル（@/infrastructure/repositories）はモックせず、個別ファイルをモックして
 * 他テストファイルとのモック汚染を防ぐ。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { User, Role } from "@/domain/models/user";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  foundUser: null as User | null,
  orgUsers: [] as User[],
  updatedUser: null as User | null,
  updateRoleArgs: null as { id: string; orgId: string; role: Role } | null,
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
  updateRole: async (id: string, orgId: string, role: Role, _tx?: unknown) => {
    state.updateRoleArgs = { id, orgId, role };
    if (!state.updatedUser) throw new Error("updatedUser not set");
    return state.updatedUser;
  },
  existsByEmail: async () => false,
  create: async () => null,
  findByEmailForAuth: async () => null,
  findByIdForAuth: async () => null,
  updateProfile: async () => null,
  updatePassword: async () => false,
  updateNotificationsLastSeenAt: async () => {},
  deactivate: async () => null,
  reactivate: async () => null,
}));

// auditRecorder のモック
// バレル経由の干渉を避けるため service 層を直接モック。
// 他のテストファイルが auditLogRepository.create を経由して state を更新する場合も
// 引き続き機能するよう、バレルの auditLogRepository.create に pass-through する。
mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (data: Record<string, unknown>, tx?: unknown) => {
    state.auditCreateArgs = data;
    // Pass-through: バレル経由で auditLogRepository.create を呼び出す。
    // 他のテストファイルのモック（barrel mock / individual file mock）が
    // 期待する呼び出しを受け取れるようにする。
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

import { updateUserRole } from "@/application/usecases/updateUserRole";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ACTOR_ID = "actor-001";
const TARGET_ID = "target-001";
const OTHER_ADMIN_ID = "other-admin-001";
const ORG_ID = "org-001";

const baseAdmin: User = {
  id: TARGET_ID,
  email: "target@example.com",
  name: "Target User",
  organizationId: ORG_ID,
  role: "admin",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

const baseMember: User = {
  id: TARGET_ID,
  email: "target@example.com",
  name: "Target User",
  organizationId: ORG_ID,
  role: "member",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

const otherAdmin: User = {
  id: OTHER_ADMIN_ID,
  email: "other-admin@example.com",
  name: "Other Admin",
  organizationId: ORG_ID,
  role: "admin",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("updateUserRole usecase", () => {
  beforeEach(() => {
    state.foundUser = null;
    state.orgUsers = [];
    state.updatedUser = null;
    state.updateRoleArgs = null;
    state.auditCreateArgs = null;
  });

  it("自己降格拒否: actorId === targetUserId のとき { ok: false } が返り、updateRole は呼ばれない", async () => {
    const result = await updateUserRole({
      actorId: TARGET_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
      newRole: "member",
    });

    expect(result.ok).toBe(false);
    expect(state.updateRoleArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });

  it("最後の admin 降格拒否: 他に有効な admin がいないとき { ok: false } が返る", async () => {
    // 対象ユーザーは admin、組織内に他の admin なし
    state.foundUser = baseAdmin;
    state.orgUsers = [baseAdmin]; // 対象ユーザーのみ

    const result = await updateUserRole({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
      newRole: "member",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("管理者");
    }
    expect(state.updateRoleArgs).toBeNull();
  });

  it("降格成功: 他に有効な admin がいれば { ok: true } が返り、updateRole と audit が呼ばれる", async () => {
    // 対象ユーザーは admin、他にも admin が存在する
    state.foundUser = baseAdmin;
    state.orgUsers = [baseAdmin, otherAdmin];
    state.updatedUser = { ...baseAdmin, role: "member" };

    const result = await updateUserRole({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
      newRole: "member",
    });

    expect(result.ok).toBe(true);

    // updateRole が正しい引数で呼ばれたことを assert
    expect(state.updateRoleArgs).not.toBeNull();
    expect(state.updateRoleArgs?.id).toBe(TARGET_ID);
    expect(state.updateRoleArgs?.orgId).toBe(ORG_ID);
    expect(state.updateRoleArgs?.role).toBe("member");

    // 監査ログが正しく記録されたことを assert
    expect(state.auditCreateArgs).not.toBeNull();
    expect(state.auditCreateArgs?.action).toBe("user.updateRole");
    expect(state.auditCreateArgs?.targetType).toBe("user");
    expect(state.auditCreateArgs?.targetId).toBe(TARGET_ID);
    expect(state.auditCreateArgs?.actorId).toBe(ACTOR_ID);
    expect(state.auditCreateArgs?.organizationId).toBe(ORG_ID);
    expect((state.auditCreateArgs?.metadata as Record<string, unknown>)?.oldRole).toBe("admin");
    expect((state.auditCreateArgs?.metadata as Record<string, unknown>)?.newRole).toBe("member");
  });

  it("role 昇格成功: member → admin への昇格は最後の admin チェックをスキップして成功する", async () => {
    // member を admin に昇格 — admin チェックは不要
    state.foundUser = baseMember;
    state.updatedUser = { ...baseMember, role: "admin" };

    const result = await updateUserRole({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
      newRole: "admin",
    });

    expect(result.ok).toBe(true);
    expect(state.updateRoleArgs?.role).toBe("admin");
    expect(state.auditCreateArgs?.action).toBe("user.updateRole");
    expect((state.auditCreateArgs?.metadata as Record<string, unknown>)?.oldRole).toBe("member");
    expect((state.auditCreateArgs?.metadata as Record<string, unknown>)?.newRole).toBe("admin");
  });

  it("対象ユーザーが見つからない場合: findById が null を返すとき { ok: false } が返る", async () => {
    state.foundUser = null;

    const result = await updateUserRole({
      actorId: ACTOR_ID,
      targetUserId: TARGET_ID,
      organizationId: ORG_ID,
      newRole: "member",
    });

    expect(result.ok).toBe(false);
    expect(state.updateRoleArgs).toBeNull();
  });
});
