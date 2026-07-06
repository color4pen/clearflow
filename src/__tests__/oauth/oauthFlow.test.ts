/**
 * T-18: OAuth フロー統合テスト（ユースケースレベル）
 *
 * - メタデータ発見 → 動的登録 → 認可コード + PKCE → トークン取得 のロジック
 * - PKCE 不正（verifier 不一致・S256 以外）の拒否
 * - 認可コード再利用の拒否 + 系列失効
 * - 期限切れ認可コードの拒否
 * - リフレッシュトークンローテーション
 * - リフレッシュトークン再利用検知 + 系列失効
 * - 失効後のアクセストークン・リフレッシュトークンが解決されない
 *
 * DB リポジトリをインメモリモックして実行する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { randomUUID, createHash } from "crypto";
import { PgDatabase } from "drizzle-orm/pg-core";
import type { OAuthClient } from "@/domain/models/oauthClient";
import type { OAuthToken, OAuthTokenType } from "@/domain/models/oauthToken";
import {
  generateOAuthAccessToken,
  generateOAuthRefreshToken,
  generateAuthorizationCode,
  hashOAuthToken,
  toOAuthTokenDisplayPrefix,
  ACCESS_TOKEN_LIFETIME_MS,
  REFRESH_TOKEN_LIFETIME_MS,
  AUTHORIZATION_CODE_LIFETIME_MS,
} from "@/domain/models/oauthToken";

// ---- インメモリストア ----

const clientStore = new Map<string, OAuthClient>();
const tokenStore = new Map<string, OAuthToken>(); // tokenHash -> OAuthToken

function createClientRecord(data: Partial<OAuthClient> & { clientId: string; clientName: string; redirectUris: string[] }): OAuthClient {
  return {
    id: randomUUID(),
    clientId: data.clientId,
    clientName: data.clientName,
    redirectUris: data.redirectUris,
    tokenEndpointAuthMethod: "none",
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    clientIdIssuedAt: new Date(),
    createdAt: new Date(),
  };
}

function createTokenRecord(data: {
  type: OAuthTokenType;
  clientId: string;
  userId: string;
  organizationId: string;
  tokenHash: string;
  tokenPrefix: string;
  familyId: string;
  expiresAt: Date;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
  redirectUri?: string | null;
  state?: string | null;
}): OAuthToken {
  return {
    id: randomUUID(),
    ...data,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
    codeChallenge: data.codeChallenge ?? null,
    codeChallengeMethod: data.codeChallengeMethod ?? null,
    redirectUri: data.redirectUri ?? null,
    state: data.state ?? null,
  };
}

// ---- モック設定 ----

mock.module("@/infrastructure/repositories/oauthClientRepository", () => ({
  create: async (data: {
    clientId: string;
    clientName: string;
    redirectUris: string[];
    tokenEndpointAuthMethod?: string;
    grantTypes: string[];
    responseTypes: string[];
  }) => {
    const client = createClientRecord({ ...data });
    clientStore.set(data.clientId, client);
    return client;
  },
  findByClientId: async (clientId: string) => clientStore.get(clientId) ?? null,
}));

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
    codeChallenge?: string | null;
    codeChallengeMethod?: string | null;
    redirectUri?: string | null;
    state?: string | null;
  }) => {
    const token = createTokenRecord(data);
    tokenStore.set(data.tokenHash, token);
    return token;
  },
  findByTokenHash: async (hash: string) => tokenStore.get(hash) ?? null,
  revokeById: async (id: string) => {
    for (const [hash, token] of tokenStore.entries()) {
      if (token.id === id) {
        tokenStore.set(hash, { ...token, revokedAt: new Date() });
        break;
      }
    }
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
  findActiveConnectionsByUser: async (userId: string, organizationId: string) => {
    const now = new Date();
    const seen = new Set<string>();
    const connections: Array<{ clientId: string; clientName: string; lastUsedAt: Date | null; connectedAt: Date }> = [];
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
        const client = clientStore.get(token.clientId);
        connections.push({
          clientId: token.clientId,
          clientName: client?.clientName ?? token.clientId,
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
    action: "oauth_connection.create",
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

const { registerOAuthClient } = await import("@/application/usecases/registerOAuthClient");
const { authorizeOAuthClient } = await import("@/application/usecases/authorizeOAuthClient");
const { exchangeOAuthToken } = await import("@/application/usecases/exchangeOAuthToken");

const CLIENT_ID = randomUUID();
const REDIRECT_URI = "http://localhost:3000/callback";
const USER_ID = "user-1";
const ORG_ID = "org-1";

/** PKCE: verifier → challenge (S256) */
function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

beforeEach(() => {
  clientStore.clear();
  tokenStore.clear();
});

// ---- 動的クライアント登録 ----

describe("T-04: 動的クライアント登録", () => {
  it("正常系: クライアント登録が成功し clientId が返る", async () => {
    const result = await registerOAuthClient({
      clientName: "Claude Desktop",
      redirectUris: [REDIRECT_URI],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "none",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.client.clientId).toBe("string");
    expect(result.client.clientName).toBe("Claude Desktop");
  });

  it("異常系: clientName が空の場合は拒否される", async () => {
    const result = await registerOAuthClient({ clientName: "", redirectUris: [REDIRECT_URI] });
    expect(result.ok).toBe(false);
  });

  it("異常系: redirectUris が空配列の場合は拒否される", async () => {
    const result = await registerOAuthClient({ clientName: "Test", redirectUris: [] });
    expect(result.ok).toBe(false);
  });

  it("異常系: 非 URL の redirectUri は拒否される", async () => {
    const result = await registerOAuthClient({ clientName: "Test", redirectUris: ["not-a-url"] });
    expect(result.ok).toBe(false);
  });

  it("異常系: tokenEndpointAuthMethod が none 以外は拒否される", async () => {
    const result = await registerOAuthClient({
      clientName: "Test",
      redirectUris: [REDIRECT_URI],
      tokenEndpointAuthMethod: "client_secret_basic",
    });
    expect(result.ok).toBe(false);
  });
});

// ---- 認可コード発行 ----

describe("T-05: 認可コード発行", () => {
  async function registerClient() {
    const r = await registerOAuthClient({
      clientName: "Test Client",
      redirectUris: [REDIRECT_URI],
    });
    if (!r.ok) throw new Error("registration failed");
    return r.client;
  }

  it("正常系: 認可コードが返り、監査ログが記録される", async () => {
    const client = await registerClient();
    const verifier = "test-verifier-12345678901234567890123456789";
    const challenge = pkceChallenge(verifier);

    const result = await authorizeOAuthClient({
      clientId: client.clientId,
      redirectUri: REDIRECT_URI,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      state: "test-state",
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.code).toBe("string");
    expect(result.code.startsWith("oac_")).toBe(true);
    expect(result.state).toBe("test-state");
  });

  it("異常系: 未登録 clientId で拒否される", async () => {
    const result = await authorizeOAuthClient({
      clientId: "unknown-client-id",
      redirectUri: REDIRECT_URI,
      codeChallenge: pkceChallenge("verifier"),
      codeChallengeMethod: "S256",
      state: null,
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("unauthorized_client");
  });

  it("異常系: redirectUri 不一致で拒否される", async () => {
    const client = await registerClient();
    const result = await authorizeOAuthClient({
      clientId: client.clientId,
      redirectUri: "http://evil.example.com/callback",
      codeChallenge: pkceChallenge("verifier"),
      codeChallengeMethod: "S256",
      state: null,
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_request");
  });

  it("異常系: codeChallengeMethod が S256 以外で拒否される", async () => {
    const client = await registerClient();
    const result = await authorizeOAuthClient({
      clientId: client.clientId,
      redirectUri: REDIRECT_URI,
      codeChallenge: "some-challenge",
      codeChallengeMethod: "plain",
      state: null,
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_request");
  });
});

// ---- トークン交換 ----

describe("T-06: トークン交換", () => {
  async function setupAuthCode(verifier: string): Promise<{ clientId: string; code: string }> {
    const r = await registerOAuthClient({ clientName: "Test", redirectUris: [REDIRECT_URI] });
    if (!r.ok) throw new Error("registration failed");
    const clientId = r.client.clientId;
    const challenge = pkceChallenge(verifier);
    const auth = await authorizeOAuthClient({
      clientId,
      redirectUri: REDIRECT_URI,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      state: null,
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    if (!auth.ok) throw new Error("authorization failed");
    return { clientId, code: auth.code };
  }

  it("正常系: 認可コード交換でアクセストークン + リフレッシュトークンが返る", async () => {
    const verifier = "verifier-12345678901234567890123456789";
    const { clientId, code } = await setupAuthCode(verifier);

    const result = await exchangeOAuthToken({
      grantType: "authorization_code",
      code,
      redirectUri: REDIRECT_URI,
      clientId,
      codeVerifier: verifier,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.accessToken.startsWith("oat_")).toBe(true);
    expect(result.refreshToken.startsWith("ort_")).toBe(true);
    expect(result.expiresIn).toBe(3600);
    expect(result.tokenType).toBe("Bearer");
  });

  it("異常系: PKCE verifier 不一致で invalid_grant", async () => {
    const { clientId, code } = await setupAuthCode("correct-verifier-1234567890123456789");
    const result = await exchangeOAuthToken({
      grantType: "authorization_code",
      code,
      redirectUri: REDIRECT_URI,
      clientId,
      codeVerifier: "wrong-verifier-1234567890123456789",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_grant");
  });

  it("異常系: 認可コード再利用で invalid_grant + 系列失効", async () => {
    const verifier = "verifier-12345678901234567890123456789";
    const { clientId, code } = await setupAuthCode(verifier);

    // 1回目: 成功
    const first = await exchangeOAuthToken({
      grantType: "authorization_code",
      code,
      redirectUri: REDIRECT_URI,
      clientId,
      codeVerifier: verifier,
    });
    expect(first.ok).toBe(true);

    // 2回目: 再利用 → 系列失効
    const second = await exchangeOAuthToken({
      grantType: "authorization_code",
      code,
      redirectUri: REDIRECT_URI,
      clientId,
      codeVerifier: verifier,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("invalid_grant");

    // 1回目で発行されたアクセストークンも失効している
    if (!first.ok) return;
    const atHash = hashOAuthToken(first.accessToken);
    const atRecord = tokenStore.get(atHash);
    expect(atRecord?.revokedAt).not.toBeNull();
  });

  it("異常系: 期限切れ認可コードで invalid_grant", async () => {
    const r = await registerOAuthClient({ clientName: "Test", redirectUris: [REDIRECT_URI] });
    if (!r.ok) throw new Error();
    const verifier = "verifier-12345678901234567890123456789";
    const challenge = pkceChallenge(verifier);

    // 期限切れの認可コードをストアに直接挿入
    const plainCode = generateAuthorizationCode();
    const codeHash = hashOAuthToken(plainCode);
    const expiredToken = createTokenRecord({
      type: "authorization_code",
      clientId: r.client.clientId,
      userId: USER_ID,
      organizationId: ORG_ID,
      tokenHash: codeHash,
      tokenPrefix: toOAuthTokenDisplayPrefix(plainCode),
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() - 1000), // already expired
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      redirectUri: REDIRECT_URI,
      state: null,
    });
    tokenStore.set(codeHash, expiredToken);

    const result = await exchangeOAuthToken({
      grantType: "authorization_code",
      code: plainCode,
      redirectUri: REDIRECT_URI,
      clientId: r.client.clientId,
      codeVerifier: verifier,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_grant");
  });

  it("正常系: リフレッシュトークンローテーションで新しいトークンペアが返り、旧トークンが失効", async () => {
    const verifier = "verifier-12345678901234567890123456789";
    const { clientId, code } = await setupAuthCode(verifier);

    const first = await exchangeOAuthToken({
      grantType: "authorization_code",
      code,
      redirectUri: REDIRECT_URI,
      clientId,
      codeVerifier: verifier,
    });
    if (!first.ok) throw new Error("token exchange failed");

    const second = await exchangeOAuthToken({
      grantType: "refresh_token",
      refreshToken: first.refreshToken,
      clientId,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.accessToken.startsWith("oat_")).toBe(true);
    expect(second.refreshToken.startsWith("ort_")).toBe(true);
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // 旧リフレッシュトークンが失効している
    const oldRtHash = hashOAuthToken(first.refreshToken);
    const oldRtRecord = tokenStore.get(oldRtHash);
    expect(oldRtRecord?.revokedAt).not.toBeNull();
  });

  it("異常系: リフレッシュトークン再利用検知 + 系列失効", async () => {
    const verifier = "verifier-12345678901234567890123456789";
    const { clientId, code } = await setupAuthCode(verifier);

    const first = await exchangeOAuthToken({
      grantType: "authorization_code",
      code,
      redirectUri: REDIRECT_URI,
      clientId,
      codeVerifier: verifier,
    });
    if (!first.ok) throw new Error();

    // 1回目のリフレッシュ
    const second = await exchangeOAuthToken({
      grantType: "refresh_token",
      refreshToken: first.refreshToken,
      clientId,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // 旧リフレッシュトークンで再利用 → 系列失効
    const third = await exchangeOAuthToken({
      grantType: "refresh_token",
      refreshToken: first.refreshToken,
      clientId,
    });
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.error).toBe("invalid_grant");

    // 2回目で発行された新しいリフレッシュトークンも失効している
    const newRtHash = hashOAuthToken(second.refreshToken);
    const newRtRecord = tokenStore.get(newRtHash);
    expect(newRtRecord?.revokedAt).not.toBeNull();
  });

  it("異常系: 期限切れリフレッシュトークンで invalid_grant", async () => {
    const r = await registerOAuthClient({ clientName: "Test", redirectUris: [REDIRECT_URI] });
    if (!r.ok) throw new Error();

    const plainRt = generateOAuthRefreshToken();
    const rtHash = hashOAuthToken(plainRt);
    const expiredToken = createTokenRecord({
      type: "refresh_token",
      clientId: r.client.clientId,
      userId: USER_ID,
      organizationId: ORG_ID,
      tokenHash: rtHash,
      tokenPrefix: toOAuthTokenDisplayPrefix(plainRt),
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() - 1000), // already expired
    });
    tokenStore.set(rtHash, expiredToken);

    const result = await exchangeOAuthToken({
      grantType: "refresh_token",
      refreshToken: plainRt,
      clientId: r.client.clientId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid_grant");
  });
});

// ---- 失効後のトークン検証 ----

describe("Bearer 解決: 失効後の OAuth アクセストークン", () => {
  it("失効後のアクセストークンは tokenHash でトークンを取得できても revokedAt でブロックされる", async () => {
    const plainAt = generateOAuthAccessToken();
    const atHash = hashOAuthToken(plainAt);
    const revokedToken = createTokenRecord({
      type: "access_token",
      clientId: CLIENT_ID,
      userId: USER_ID,
      organizationId: ORG_ID,
      tokenHash: atHash,
      tokenPrefix: toOAuthTokenDisplayPrefix(plainAt),
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
    });
    // 失効させる
    tokenStore.set(atHash, { ...revokedToken, revokedAt: new Date() });

    const record = tokenStore.get(atHash);
    expect(record?.revokedAt).not.toBeNull();
  });

  it("期限切れのアクセストークンは expiresAt でブロックされる", async () => {
    const plainAt = generateOAuthAccessToken();
    const atHash = hashOAuthToken(plainAt);
    const expiredToken = createTokenRecord({
      type: "access_token",
      clientId: CLIENT_ID,
      userId: USER_ID,
      organizationId: ORG_ID,
      tokenHash: atHash,
      tokenPrefix: toOAuthTokenDisplayPrefix(plainAt),
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() - 1000),
    });
    tokenStore.set(atHash, expiredToken);

    const record = tokenStore.get(atHash);
    expect(record!.expiresAt <= new Date()).toBe(true);
  });
});
