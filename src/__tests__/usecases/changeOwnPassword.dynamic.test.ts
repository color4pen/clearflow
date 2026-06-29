/**
 * changeOwnPassword usecase の動的テスト。
 * 個別ファイルモックを使ってビジネスロジックを検証する。
 * バレル（@/infrastructure/repositories）はモックせず、個別ファイルをモックして
 * 他テストファイルとのモック汚染を防ぐ。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { User } from "@/domain/models/user";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

type UserWithPassword = User & { hashedPassword: string };

const state = {
  authUser: null as UserWithPassword | null,
  bcryptCompareResult: false,
  updatePasswordArgs: null as { id: string; orgId: string; hashedPassword: string } | null,
  updatePasswordResult: false,
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
  findByIdForAuth: async (_id: string, _orgId: string) => state.authUser,
  updatePassword: async (id: string, orgId: string, hashedPassword: string, _tx?: unknown) => {
    state.updatePasswordArgs = { id, orgId, hashedPassword };
    return state.updatePasswordResult;
  },
  findById: async () => null,
  findByOrganization: async () => [],
  existsByEmail: async () => false,
  create: async () => null,
  findByEmailForAuth: async () => null,
  updateRole: async () => null,
  updateProfile: async () => null,
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

// bcrypt のモック:
//   compare → state.bcryptCompareResult で制御
//   hash → 固定値 "new_hashed_password" を返す
mock.module("bcryptjs", () => ({
  default: {
    hash: async (_password: string, _rounds: number) => "new_hashed_password",
    compare: async (_plain: string, _hashed: string) => state.bcryptCompareResult,
  },
}));

import { changeOwnPassword } from "@/application/usecases/changeOwnPassword";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const USER_ID = "user-001";
const ORG_ID = "org-001";

const authUser: UserWithPassword = {
  id: USER_ID,
  email: "user@example.com",
  name: "Test User",
  organizationId: ORG_ID,
  role: "member",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
  hashedPassword: "stored_hashed_password",
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("changeOwnPassword usecase", () => {
  beforeEach(() => {
    state.authUser = null;
    state.bcryptCompareResult = false;
    state.updatePasswordArgs = null;
    state.updatePasswordResult = false;
    state.auditCreateArgs = null;
  });

  it("ユーザーが見つからない場合: findByIdForAuth が null を返すとき { ok: false } が返る", async () => {
    state.authUser = null;

    const result = await changeOwnPassword({
      userId: USER_ID,
      organizationId: ORG_ID,
      currentPassword: "oldpass",
      newPassword: "newpass",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("ユーザーが見つかりません");
    }
    expect(state.updatePasswordArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });

  it("現在パスワード不一致: bcrypt.compare が false を返すとき { ok: false } が返り、updatePassword は呼ばれない", async () => {
    state.authUser = authUser;
    state.bcryptCompareResult = false;

    const result = await changeOwnPassword({
      userId: USER_ID,
      organizationId: ORG_ID,
      currentPassword: "wrongpass",
      newPassword: "newpass",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("パスワードが正しくありません");
    }
    expect(state.updatePasswordArgs).toBeNull();
    expect(state.auditCreateArgs).toBeNull();
  });

  it("パスワード変更成功: { ok: true } が返り、updatePassword が bcrypt.hash の戻り値で呼ばれ、audit が記録される", async () => {
    state.authUser = authUser;
    state.bcryptCompareResult = true;
    state.updatePasswordResult = true;

    const result = await changeOwnPassword({
      userId: USER_ID,
      organizationId: ORG_ID,
      currentPassword: "currentpass",
      newPassword: "newpass",
    });

    expect(result.ok).toBe(true);

    // updatePassword が bcrypt.hash の戻り値（"new_hashed_password"）で呼ばれたことを assert
    expect(state.updatePasswordArgs).not.toBeNull();
    expect(state.updatePasswordArgs?.id).toBe(USER_ID);
    expect(state.updatePasswordArgs?.orgId).toBe(ORG_ID);
    expect(state.updatePasswordArgs?.hashedPassword).toBe("new_hashed_password");

    // 監査ログが正しく記録されたことを assert
    expect(state.auditCreateArgs).not.toBeNull();
    expect(state.auditCreateArgs?.action).toBe("user.updatePassword");
    expect(state.auditCreateArgs?.targetType).toBe("user");
    // actorId と targetId が共に userId であることを assert
    expect(state.auditCreateArgs?.actorId).toBe(USER_ID);
    expect(state.auditCreateArgs?.targetId).toBe(USER_ID);
    expect(state.auditCreateArgs?.organizationId).toBe(ORG_ID);
  });
});
