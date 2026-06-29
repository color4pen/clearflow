/**
 * provisionOrganization usecase の動的テスト。
 * 個別ファイルモックを使ってビジネスロジックを検証する。
 * バレル（@/infrastructure/repositories）はモックせず、個別ファイルをモックして
 * 他テストファイルとのモック汚染を防ぐ。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Organization } from "@/domain/models/organization";
import type { User } from "@/domain/models/user";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  emailExists: false,
  createdOrganization: null as Organization | null,
  createdUser: null as User | null,
  orgCreateArgs: null as { name: string } | null,
  userCreateArgs: null as Record<string, unknown> | null,
  auditCreateArgs: null as Record<string, unknown> | null,
  throwCode: null as string | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（個別ファイル — バレルは使わない）
// ---------------------------------------------------------------------------

// DB: transaction を即時実行するモック
mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      if (state.throwCode) {
        const err = new Error("DB error") as Error & { code: string };
        err.code = state.throwCode;
        throw err;
      }
      await fn({});
    },
  },
}));

// organizationRepository の個別ファイルモック
mock.module("@/infrastructure/repositories/organizationRepository", () => ({
  create: async (data: { name: string }, _tx?: unknown) => {
    state.orgCreateArgs = data;
    if (!state.createdOrganization) throw new Error("org not set");
    return state.createdOrganization;
  },
  findAll: async () => [],
  findById: async () => null,
  update: async () => null,
}));

// userRepository の個別ファイルモック
mock.module("@/infrastructure/repositories/userRepository", () => ({
  existsByEmail: async (_email: string) => state.emailExists,
  create: async (data: Record<string, unknown>, _tx?: unknown) => {
    state.userCreateArgs = data;
    if (!state.createdUser) throw new Error("user not set");
    return state.createdUser;
  },
  findByOrganization: async () => [],
  findById: async () => null,
  findByEmailForAuth: async () => null,
  updateRole: async () => null,
  updateProfile: async () => null,
  updatePassword: async () => false,
  updateNotificationsLastSeenAt: async () => {},
  findByIdForAuth: async () => null,
  deactivate: async () => null,
  reactivate: async () => null,
}));

// auditLogRepository の個別ファイルモック（auditRecorder はそのままにする）
mock.module("@/infrastructure/repositories/auditLogRepository", () => ({
  create: async (data: Record<string, unknown>, _tx?: unknown) => {
    state.auditCreateArgs = data;
    return {
      id: "audit-001",
      ...data,
      createdAt: new Date(),
    };
  },
  findByOrganization: async () => [],
  findByTargets: async () => [],
}));

// bcrypt はハッシュ計算をスキップ
mock.module("bcryptjs", () => ({
  default: {
    hash: async (_password: string, _rounds: number) => "hashed_password",
    compare: async (_plain: string, _hashed: string) => true,
  },
}));

import { provisionOrganization } from "@/application/usecases/provisionOrganization";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ACTOR_ID = "actor-001";
const ORG_ID = "org-001";
const USER_ID = "user-001";

const baseOrganization: Organization = {
  id: ORG_ID,
  name: "TestOrg",
  createdAt: new Date("2026-01-01"),
};

const baseAdminUser: User = {
  id: USER_ID,
  email: "admin@testorg.com",
  name: "Test Admin",
  organizationId: ORG_ID,
  role: "admin",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("provisionOrganization usecase", () => {
  beforeEach(() => {
    state.emailExists = false;
    state.createdOrganization = null;
    state.createdUser = null;
    state.orgCreateArgs = null;
    state.userCreateArgs = null;
    state.auditCreateArgs = null;
    state.throwCode = null;
  });

  it("正常系: 組織と admin ユーザーが作成され、戻り値に organization と adminUser が含まれる", async () => {
    state.createdOrganization = baseOrganization;
    state.createdUser = baseAdminUser;

    const result = await provisionOrganization({
      actorId: ACTOR_ID,
      organizationName: "TestOrg",
      adminEmail: "admin@testorg.com",
      adminName: "Test Admin",
      adminPassword: "securepass123",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.organization.id).toBe(ORG_ID);
      expect(result.organization.name).toBe("TestOrg");
      expect(result.adminUser.organizationId).toBe(ORG_ID);
      expect(result.adminUser.role).toBe("admin");
      expect(result.adminUser.email).toBe("admin@testorg.com");
    }
  });

  it("正常系: 監査ログが organization.create で記録される", async () => {
    state.createdOrganization = baseOrganization;
    state.createdUser = baseAdminUser;

    await provisionOrganization({
      actorId: ACTOR_ID,
      organizationName: "TestOrg",
      adminEmail: "admin@testorg.com",
      adminName: "Test Admin",
      adminPassword: "securepass123",
    });

    expect(state.auditCreateArgs).not.toBeNull();
    expect(state.auditCreateArgs?.action).toBe("organization.create");
    expect(state.auditCreateArgs?.targetType).toBe("organization");
    expect(state.auditCreateArgs?.targetId).toBe(ORG_ID);
    expect(state.auditCreateArgs?.actorId).toBe(ACTOR_ID);
    expect(state.auditCreateArgs?.organizationId).toBe(ORG_ID);
  });

  it("email 重複: existsByEmail が true を返すとき { ok: false } が返り、create は呼ばれない", async () => {
    state.emailExists = true;

    const result = await provisionOrganization({
      actorId: ACTOR_ID,
      organizationName: "TestOrg",
      adminEmail: "existing@example.com",
      adminName: "Test Admin",
      adminPassword: "securepass123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("メールアドレス");
    }
    expect(state.orgCreateArgs).toBeNull();
    expect(state.userCreateArgs).toBeNull();
  });

  it("DB unique 制約違反（23505）: { ok: false } が返る", async () => {
    state.createdOrganization = baseOrganization;
    state.createdUser = baseAdminUser;
    state.throwCode = "23505";

    const result = await provisionOrganization({
      actorId: ACTOR_ID,
      organizationName: "TestOrg",
      adminEmail: "admin@testorg.com",
      adminName: "Test Admin",
      adminPassword: "securepass123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("メールアドレス");
    }
  });
});
