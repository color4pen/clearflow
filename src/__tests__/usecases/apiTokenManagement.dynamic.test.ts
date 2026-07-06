/**
 * createApiToken / revokeApiToken ユースケースの動的テスト。
 * 個別ファイルモックで実際にユースケースを実行し、
 * 本人+テナントスコープ・監査記録・平文トークンの形式を検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  API_TOKEN_PREFIX,
  hashApiToken,
  type ApiToken,
} from "@/domain/models/apiToken";

type CreateArgs = {
  organizationId: string;
  userId: string;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  expiresAt?: Date | null;
};

const state = {
  createArgs: null as CreateArgs | null,
  revokeArgs: null as { id: string; userId: string; organizationId: string } | null,
  revokeReturns: null as ApiToken | null,
  auditCalls: [] as Record<string, unknown>[],
};

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

mock.module("@/infrastructure/repositories/apiTokenRepository", () => ({
  create: async (data: CreateArgs) => {
    state.createArgs = data;
    return {
      id: "tok-new",
      organizationId: data.organizationId,
      userId: data.userId,
      name: data.name,
      tokenPrefix: data.tokenPrefix,
      lastUsedAt: null,
      expiresAt: data.expiresAt ?? null,
      revokedAt: null,
      createdAt: new Date("2026-07-06"),
    } satisfies ApiToken;
  },
  revokeById: async (id: string, userId: string, organizationId: string) => {
    state.revokeArgs = { id, userId, organizationId };
    return state.revokeReturns;
  },
  findByTokenHash: async () => null,
  findByUserAndOrganization: async () => [],
  updateLastUsedAt: async () => {},
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (data: Record<string, unknown>) => {
    state.auditCalls.push(data);
  },
}));

const { createApiToken } = await import("@/application/usecases/createApiToken");
const { revokeApiToken } = await import("@/application/usecases/revokeApiToken");

const ORG = "org-1";
const USER = "user-1";

beforeEach(() => {
  state.createArgs = null;
  state.revokeArgs = null;
  state.revokeReturns = null;
  state.auditCalls = [];
});

describe("createApiToken", () => {
  it("空の名前は拒否する", async () => {
    const result = await createApiToken({ userId: USER, organizationId: ORG, name: "  " });
    expect(result.ok).toBe(false);
    expect(state.createArgs).toBeNull();
  });

  it("100 文字超の名前は拒否する", async () => {
    const result = await createApiToken({
      userId: USER,
      organizationId: ORG,
      name: "a".repeat(101),
    });
    expect(result.ok).toBe(false);
    expect(state.createArgs).toBeNull();
  });

  it("cfp_ プレフィクスの平文を返し、保存ハッシュはその SHA-256 に一致する", async () => {
    const result = await createApiToken({ userId: USER, organizationId: ORG, name: "MCP" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plainToken.startsWith(API_TOKEN_PREFIX)).toBe(true);
    expect(state.createArgs?.tokenHash).toBe(hashApiToken(result.plainToken));
    // 平文そのものは保存されない
    expect(state.createArgs?.tokenHash).not.toContain(result.plainToken);
  });

  it("組織・ユーザーをテナントスコープとして保存し、監査 api_token.create を記録する", async () => {
    await createApiToken({ userId: USER, organizationId: ORG, name: "MCP" });
    expect(state.createArgs?.organizationId).toBe(ORG);
    expect(state.createArgs?.userId).toBe(USER);
    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0]).toMatchObject({
      action: "api_token.create",
      targetType: "api_token",
      actorId: USER,
      organizationId: ORG,
    });
  });

  it("名前を trim して保存する", async () => {
    await createApiToken({ userId: USER, organizationId: ORG, name: "  MCP  " });
    expect(state.createArgs?.name).toBe("MCP");
  });
});

describe("revokeApiToken", () => {
  it("本人+テナントを WHERE に渡し、成功時に監査 api_token.revoke を記録する", async () => {
    state.revokeReturns = {
      id: "tok-1",
      organizationId: ORG,
      userId: USER,
      name: "MCP",
      tokenPrefix: "cfp_abcd",
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: new Date("2026-07-06"),
      createdAt: new Date("2026-07-01"),
    };
    const result = await revokeApiToken({ tokenId: "tok-1", userId: USER, organizationId: ORG });
    expect(result.ok).toBe(true);
    expect(state.revokeArgs).toEqual({ id: "tok-1", userId: USER, organizationId: ORG });
    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0]).toMatchObject({
      action: "api_token.revoke",
      targetType: "api_token",
      actorId: USER,
      organizationId: ORG,
    });
  });

  it("対象が見つからない（他人のトークン等）場合は失敗し、監査を記録しない", async () => {
    state.revokeReturns = null;
    const result = await revokeApiToken({ tokenId: "tok-x", userId: USER, organizationId: ORG });
    expect(result.ok).toBe(false);
    expect(state.auditCalls).toHaveLength(0);
  });
});
