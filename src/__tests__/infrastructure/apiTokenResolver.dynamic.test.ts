/**
 * resolveBearer の動的テスト。
 * 個別ファイルモック（apiTokenRepository / userRepository）で実際に resolveBearer を
 * 実行し、拒否パスと成功パスの振る舞いを検証する。
 * バレル（@/infrastructure/repositories）はモックせず、個別ファイルをモックして
 * 他テストファイルとのモック汚染を防ぐ。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { User } from "@/domain/models/user";
import {
  generatePlainToken,
  hashApiToken,
} from "@/domain/models/apiToken";

type TokenRecord = {
  id: string;
  organizationId: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
};

const state = {
  tokenByHash: new Map<string, TokenRecord>(),
  userById: null as User | null,
  lastUsedUpdate: null as { id: string; organizationId: string } | null,
  updateShouldThrow: false,
};

mock.module("@/infrastructure/repositories/apiTokenRepository", () => ({
  findByTokenHash: async (hash: string) => state.tokenByHash.get(hash) ?? null,
  updateLastUsedAt: async (id: string, organizationId: string) => {
    if (state.updateShouldThrow) throw new Error("transient DB error");
    state.lastUsedUpdate = { id, organizationId };
  },
  create: async () => null,
  findByUserAndOrganization: async () => [],
  revokeById: async () => null,
}));

mock.module("@/infrastructure/repositories/userRepository", () => ({
  findById: async (id: string, orgId: string) =>
    state.userById && state.userById.id === id && state.userById.organizationId === orgId
      ? state.userById
      : null,
  findByOrganization: async () => [],
  existsByEmail: async () => false,
  create: async () => null,
  findByEmailForAuth: async () => null,
  findByIdForAuth: async () => null,
  updateRole: async () => null,
  updateProfile: async () => null,
  updatePassword: async () => false,
  updateNotificationsLastSeenAt: async () => {},
  deactivate: async () => null,
  reactivate: async () => null,
}));

const { resolveBearer } = await import("@/infrastructure/apiTokenResolver");

const ORG = "org-1";
const USER_ID = "user-1";

function activeUser(): User {
  return {
    id: USER_ID,
    email: "u@example.com",
    name: "U",
    organizationId: ORG,
    role: "member",
    notificationsLastSeenAt: null,
    createdAt: new Date("2026-01-01"),
    deactivatedAt: null,
  };
}

/** 有効な平文トークンを登録し、その平文を返す。 */
function seedToken(overrides: Partial<TokenRecord> = {}): string {
  const plain = generatePlainToken();
  const hash = hashApiToken(plain);
  state.tokenByHash.set(hash, {
    id: "tok-1",
    organizationId: ORG,
    userId: USER_ID,
    revokedAt: null,
    expiresAt: null,
    ...overrides,
  });
  return plain;
}

beforeEach(() => {
  state.tokenByHash.clear();
  state.userById = activeUser();
  state.lastUsedUpdate = null;
  state.updateShouldThrow = false;
});

describe("resolveBearer — 拒否パス", () => {
  it("ヘッダが null なら null", async () => {
    expect(await resolveBearer(null)).toBeNull();
  });

  it('"Bearer " で始まらなければ null', async () => {
    const plain = seedToken();
    expect(await resolveBearer(plain)).toBeNull();
  });

  it("プレフィクスが cfp_ でなければ null", async () => {
    expect(await resolveBearer("Bearer xxx_abcdef")).toBeNull();
  });

  it("DB に一致するトークンが無ければ null", async () => {
    const plain = generatePlainToken(); // 登録しない
    expect(await resolveBearer(`Bearer ${plain}`)).toBeNull();
  });

  it("失効済みトークンは拒否する", async () => {
    const plain = seedToken({ revokedAt: new Date("2026-06-01") });
    expect(await resolveBearer(`Bearer ${plain}`)).toBeNull();
  });

  it("期限切れトークンは拒否する（過去の expiresAt）", async () => {
    const plain = seedToken({ expiresAt: new Date(Date.now() - 60_000) });
    expect(await resolveBearer(`Bearer ${plain}`)).toBeNull();
  });

  it("期限が現在時刻ちょうど（境界）でも拒否する", async () => {
    const now = new Date();
    const plain = seedToken({ expiresAt: now });
    // resolveBearer は自身で new Date() を取るため、seed の now は必ず <= になる
    expect(await resolveBearer(`Bearer ${plain}`)).toBeNull();
  });

  it("トークンは有効だがユーザーが存在しなければ null", async () => {
    const plain = seedToken();
    state.userById = null;
    expect(await resolveBearer(`Bearer ${plain}`)).toBeNull();
  });

  it("無効化されたユーザーのトークンは拒否する", async () => {
    const plain = seedToken();
    state.userById = { ...activeUser(), deactivatedAt: new Date("2026-06-01") };
    expect(await resolveBearer(`Bearer ${plain}`)).toBeNull();
  });
});

describe("resolveBearer — 成功パス", () => {
  it("有効なトークンで userId / organizationId / role を解決する", async () => {
    const plain = seedToken();
    const result = await resolveBearer(`Bearer ${plain}`);
    expect(result).toEqual({ userId: USER_ID, organizationId: ORG, role: "member" });
  });

  it("未来の expiresAt なら解決できる", async () => {
    const plain = seedToken({ expiresAt: new Date(Date.now() + 3_600_000) });
    const result = await resolveBearer(`Bearer ${plain}`);
    expect(result?.userId).toBe(USER_ID);
  });

  it("解決時に lastUsedAt をテナントスコープ付きで更新する", async () => {
    const plain = seedToken();
    await resolveBearer(`Bearer ${plain}`);
    expect(state.lastUsedUpdate).toEqual({ id: "tok-1", organizationId: ORG });
  });

  it("lastUsedAt 更新が失敗しても認証は成功する（ベストエフォート）", async () => {
    const plain = seedToken();
    state.updateShouldThrow = true;
    const result = await resolveBearer(`Bearer ${plain}`);
    expect(result?.userId).toBe(USER_ID);
  });
});
