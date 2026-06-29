/**
 * createUser usecase の動的テスト。
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
  emailExists: false,
  createdUser: null as User | null,
  userCreateArgs: null as Record<string, unknown> | null,
  auditCreateArgs: null as Record<string, unknown> | null,
  throwCode: null as string | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（個別ファイル — バレルは使わない）
// ---------------------------------------------------------------------------

// DB: transaction を即時実行するモック（throwCode が設定されていれば該当エラーをスロー）
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

// userRepository の個別ファイルモック
mock.module("@/infrastructure/repositories/userRepository", () => ({
  existsByEmail: async (_email: string) => state.emailExists,
  create: async (data: Record<string, unknown>, _tx?: unknown) => {
    state.userCreateArgs = data;
    if (!state.createdUser) throw new Error("createdUser not set");
    return state.createdUser;
  },
  findById: async () => null,
  findByOrganization: async () => [],
  findByEmailForAuth: async () => null,
  findByIdForAuth: async () => null,
  updateRole: async () => null,
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

// bcrypt のモック: hash は固定値、compare は常に true
mock.module("bcryptjs", () => ({
  default: {
    hash: async (_password: string, _rounds: number) => "hashed_password",
    compare: async (_plain: string, _hashed: string) => true,
  },
}));

import { createUser } from "@/application/usecases/createUser";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ACTOR_ID = "actor-001";
const ORG_ID = "org-001";
const USER_ID = "user-new-001";

const newUser: User = {
  id: USER_ID,
  email: "newuser@example.com",
  name: "New User",
  organizationId: ORG_ID,
  role: "member",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-06-29"),
  deactivatedAt: null,
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("createUser usecase", () => {
  beforeEach(() => {
    state.emailExists = false;
    state.createdUser = null;
    state.userCreateArgs = null;
    state.auditCreateArgs = null;
    state.throwCode = null;
  });

  it("email 重複拒否（事前チェック）: existsByEmail が true のとき { ok: false } が返り、userRepository.create は呼ばれない", async () => {
    state.emailExists = true;

    const result = await createUser({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      email: "newuser@example.com",
      name: "New User",
      role: "member",
      password: "securepass123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("メールアドレス");
    }
    expect(state.userCreateArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });

  it("23505 フォールバック: transaction が 23505 エラーをスローしたとき { ok: false } が返る", async () => {
    state.emailExists = false;
    state.throwCode = "23505";

    const result = await createUser({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      email: "newuser@example.com",
      name: "New User",
      role: "member",
      password: "securepass123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("メールアドレス");
    }
  });

  it("成功パス: { ok: true, user } が返り、bcrypt ハッシュ済みパスワードで create が呼ばれ、audit が記録される", async () => {
    state.emailExists = false;
    state.createdUser = newUser;

    const result = await createUser({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      email: "newuser@example.com",
      name: "New User",
      role: "member",
      password: "securepass123",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(USER_ID);
    }

    // userRepository.create が正しい引数で呼ばれたことを assert
    expect(state.userCreateArgs).not.toBeNull();
    expect(state.userCreateArgs?.organizationId).toBe(ORG_ID);
    expect(state.userCreateArgs?.email).toBe("newuser@example.com");
    expect(state.userCreateArgs?.role).toBe("member");
    // bcrypt モックの戻り値がそのまま渡されていることを assert
    expect(state.userCreateArgs?.hashedPassword).toBe("hashed_password");

    // 監査ログが正しく記録されたことを assert
    expect(state.auditCreateArgs).not.toBeNull();
    expect(state.auditCreateArgs?.action).toBe("user.create");
    expect(state.auditCreateArgs?.targetType).toBe("user");
    expect(state.auditCreateArgs?.targetId).toBe(USER_ID);
    expect(state.auditCreateArgs?.actorId).toBe(ACTOR_ID);
    expect(state.auditCreateArgs?.organizationId).toBe(ORG_ID);
  });

  it("成功パス: role と organizationId が正しく userRepository.create に渡される", async () => {
    state.emailExists = false;
    state.createdUser = { ...newUser, role: "admin" };

    await createUser({
      organizationId: ORG_ID,
      actorId: ACTOR_ID,
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      password: "adminpass123",
    });

    expect(state.userCreateArgs?.organizationId).toBe(ORG_ID);
    expect(state.userCreateArgs?.role).toBe("admin");
    expect(state.userCreateArgs?.email).toBe("admin@example.com");
    expect(state.userCreateArgs?.hashedPassword).toBe("hashed_password");
  });
});
