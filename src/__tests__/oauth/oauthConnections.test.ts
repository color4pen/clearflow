/**
 * T-18: OAuth 接続管理テスト
 *
 * - 接続一覧: 自分の接続のみ表示（organizationId でテナントスコープ）
 * - 接続解除: トークン系列の全失効
 * - 他ユーザーの接続を一覧・解除できないこと
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { randomUUID } from "crypto";
import { PgDatabase } from "drizzle-orm/pg-core";
import type { OAuthToken, OAuthTokenType } from "@/domain/models/oauthToken";
import {
  generateOAuthAccessToken,
  generateOAuthRefreshToken,
  hashOAuthToken,
  toOAuthTokenDisplayPrefix,
  ACCESS_TOKEN_LIFETIME_MS,
  REFRESH_TOKEN_LIFETIME_MS,
} from "@/domain/models/oauthToken";

// ---- インメモリストア ----

type ConnectionRecord = {
  clientId: string;
  clientName: string;
  lastUsedAt: Date | null;
  connectedAt: Date;
};

const tokenStore = new Map<string, OAuthToken>();
const clientNameMap = new Map<string, string>(); // clientId -> clientName

function createTokenRecord(data: {
  type: OAuthTokenType;
  clientId: string;
  userId: string;
  organizationId: string;
  tokenHash: string;
  tokenPrefix: string;
  familyId: string;
  expiresAt: Date;
}): OAuthToken {
  return {
    id: randomUUID(),
    ...data,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
    codeChallenge: null,
    codeChallengeMethod: null,
    redirectUri: null,
    state: null,
  };
}

// ---- モック設定 ----

mock.module("@/infrastructure/repositories/oauthTokenRepository", () => ({
  create: async (data: {
    type: OAuthTokenType;
    clientId: string;
    userId: string;
    organizationId: string;
    tokenHash: string;
    tokenPrefix: string;
    familyId: string;
    expiresAt: Date;
  }) => {
    const token = createTokenRecord(data);
    tokenStore.set(data.tokenHash, token);
    return token;
  },
  findByTokenHash: async (hash: string) => tokenStore.get(hash) ?? null,
  revokeById: async (id: string) => {
    for (const [hash, token] of tokenStore.entries()) {
      if (token.id === id) {
        if (token.revokedAt !== null) return false;
        tokenStore.set(hash, { ...token, revokedAt: new Date() });
        return true;
      }
    }
    return false;
  },
  revokeByFamilyId: async (familyId: string) => {
    for (const [hash, token] of tokenStore.entries()) {
      if (token.familyId === familyId && token.revokedAt === null) {
        tokenStore.set(hash, { ...token, revokedAt: new Date() });
      }
    }
  },
  revokeByUserAndClientId: async (userId: string, clientId: string, organizationId: string) => {
    for (const [hash, token] of tokenStore.entries()) {
      if (
        token.userId === userId &&
        token.clientId === clientId &&
        token.organizationId === organizationId &&
        token.revokedAt === null
      ) {
        tokenStore.set(hash, { ...token, revokedAt: new Date() });
      }
    }
  },
  findActiveConnectionsByUser: async (userId: string, organizationId: string): Promise<ConnectionRecord[]> => {
    const now = new Date();
    const seen = new Set<string>();
    const connections: ConnectionRecord[] = [];
    for (const token of tokenStore.values()) {
      if (
        token.userId === userId &&
        token.organizationId === organizationId &&
        (token.type === "access_token" || token.type === "refresh_token") &&
        token.revokedAt === null &&
        token.expiresAt > now &&
        !seen.has(token.clientId)
      ) {
        seen.add(token.clientId);
        connections.push({
          clientId: token.clientId,
          clientName: clientNameMap.get(token.clientId) ?? token.clientId,
          lastUsedAt: token.lastUsedAt,
          connectedAt: token.createdAt,
        });
      }
    }
    return connections;
  },
  updateLastUsedAt: async () => {},
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async () => ({
    id: randomUUID(),
    action: "oauth_connection.revoke",
    targetType: "oauth_connection",
    targetId: "test",
    actorId: "user-1",
    organizationId: "org-1",
    metadata: null,
    createdAt: new Date(),
  }),
}));

mock.module("@/infrastructure/db", () => {
  const mockDb = Object.create(PgDatabase.prototype) as {
    transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  };
  mockDb.transaction = async (fn: (tx: unknown) => Promise<unknown>) => fn({});
  return { db: mockDb };
});

const { listOAuthConnections } = await import("@/application/usecases/listOAuthConnections");
const { revokeOAuthConnection } = await import("@/application/usecases/revokeOAuthConnection");

// ---- ヘルパー ----

const USER_A = "user-a";
const USER_B = "user-b";
const ORG = "org-1";
const CLIENT_ID_1 = randomUUID();
const CLIENT_ID_2 = randomUUID();

clientNameMap.set(CLIENT_ID_1, "Claude Desktop");
clientNameMap.set(CLIENT_ID_2, "Claude Web");

function seedActiveToken(opts: { userId: string; clientId: string; type: OAuthTokenType }) {
  const plain = opts.type === "access_token" ? generateOAuthAccessToken() : generateOAuthRefreshToken();
  const hash = hashOAuthToken(plain);
  const token = createTokenRecord({
    type: opts.type,
    clientId: opts.clientId,
    userId: opts.userId,
    organizationId: ORG,
    tokenHash: hash,
    tokenPrefix: toOAuthTokenDisplayPrefix(plain),
    familyId: randomUUID(),
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
  });
  tokenStore.set(hash, token);
  return { plain, hash, token };
}

beforeEach(() => {
  tokenStore.clear();
});

// ---- テスト ----

describe("listOAuthConnections", () => {
  it("接続一覧: ユーザー A の接続のみが返る", async () => {
    seedActiveToken({ userId: USER_A, clientId: CLIENT_ID_1, type: "access_token" });
    seedActiveToken({ userId: USER_B, clientId: CLIENT_ID_2, type: "access_token" });

    const connections = await listOAuthConnections({ userId: USER_A, organizationId: ORG });
    expect(connections.length).toBe(1);
    expect(connections[0]?.clientId).toBe(CLIENT_ID_1);
  });

  it("接続一覧: ユーザー A が複数アプリ接続している場合にすべて表示される", async () => {
    seedActiveToken({ userId: USER_A, clientId: CLIENT_ID_1, type: "access_token" });
    seedActiveToken({ userId: USER_A, clientId: CLIENT_ID_2, type: "refresh_token" });

    const connections = await listOAuthConnections({ userId: USER_A, organizationId: ORG });
    expect(connections.length).toBe(2);
    const clientIds = connections.map((c) => c.clientId);
    expect(clientIds).toContain(CLIENT_ID_1);
    expect(clientIds).toContain(CLIENT_ID_2);
  });

  it("接続がない場合は空配列を返す", async () => {
    const connections = await listOAuthConnections({ userId: USER_A, organizationId: ORG });
    expect(connections.length).toBe(0);
  });

  it("失効済みトークンは一覧に表示されない", async () => {
    const { hash } = seedActiveToken({ userId: USER_A, clientId: CLIENT_ID_1, type: "access_token" });
    // 失効させる
    const token = tokenStore.get(hash)!;
    tokenStore.set(hash, { ...token, revokedAt: new Date() });

    const connections = await listOAuthConnections({ userId: USER_A, organizationId: ORG });
    expect(connections.length).toBe(0);
  });
});

describe("revokeOAuthConnection", () => {
  it("接続解除: 指定クライアントのすべてのトークンが失効する", async () => {
    const { hash: atHash } = seedActiveToken({ userId: USER_A, clientId: CLIENT_ID_1, type: "access_token" });
    const { hash: rtHash } = seedActiveToken({ userId: USER_A, clientId: CLIENT_ID_1, type: "refresh_token" });

    const result = await revokeOAuthConnection({
      userId: USER_A,
      organizationId: ORG,
      clientId: CLIENT_ID_1,
    });
    expect(result.ok).toBe(true);

    expect(tokenStore.get(atHash)?.revokedAt).not.toBeNull();
    expect(tokenStore.get(rtHash)?.revokedAt).not.toBeNull();
  });

  it("接続解除: 他ユーザーのトークンには影響しない", async () => {
    const { hash: userAHash } = seedActiveToken({ userId: USER_A, clientId: CLIENT_ID_1, type: "access_token" });
    const { hash: userBHash } = seedActiveToken({ userId: USER_B, clientId: CLIENT_ID_1, type: "access_token" });

    await revokeOAuthConnection({
      userId: USER_A,
      organizationId: ORG,
      clientId: CLIENT_ID_1,
    });

    // ユーザー A のトークンは失効
    expect(tokenStore.get(userAHash)?.revokedAt).not.toBeNull();
    // ユーザー B のトークンは維持
    expect(tokenStore.get(userBHash)?.revokedAt).toBeNull();
  });

  it("他ユーザーの接続一覧を見ることができない", async () => {
    seedActiveToken({ userId: USER_B, clientId: CLIENT_ID_2, type: "access_token" });

    // ユーザー A は自分の接続のみ取得できる
    const connectionsA = await listOAuthConnections({ userId: USER_A, organizationId: ORG });
    expect(connectionsA.length).toBe(0);

    // ユーザー B は自分の接続を取得できる
    const connectionsB = await listOAuthConnections({ userId: USER_B, organizationId: ORG });
    expect(connectionsB.length).toBe(1);
    expect(connectionsB[0]?.clientId).toBe(CLIENT_ID_2);
  });
});
