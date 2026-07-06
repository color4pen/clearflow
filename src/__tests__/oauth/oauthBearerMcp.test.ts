/**
 * TC-020/021/022/049: OAuth アクセストークンによる MCP アクセス（HTTP レベル）
 *
 * - 有効な oat_ トークン → MCP 200（TC-020）
 * - 失効済み oat_ トークン → MCP 401（TC-021）
 * - 期限切れ oat_ トークン → MCP 401（TC-022）
 * - 一連のフロー（登録→認可→トークン交換→MCP アクセス）（TC-049）
 *
 * リポジトリをインメモリモックして、resolveBearer 経由の MCP ルートを
 * HTTP レベルで検証する。既存の「Bearer 解決」テスト（tokenStore 状態確認のみ）が
 * resolveBearer / MCP エンドポイントを一切呼び出していないことを補完する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { randomUUID, createHash } from "crypto";
import { PgDatabase } from "drizzle-orm/pg-core";
import type { OAuthClient } from "@/domain/models/oauthClient";
import type { OAuthToken, OAuthTokenType } from "@/domain/models/oauthToken";
import type { User } from "@/domain/models/user";
import {
  generateOAuthAccessToken,
  hashOAuthToken,
  toOAuthTokenDisplayPrefix,
  ACCESS_TOKEN_LIFETIME_MS,
} from "@/domain/models/oauthToken";

// ---- インメモリストア ----

const tokenStore = new Map<string, OAuthToken>(); // tokenHash -> OAuthToken
const clientStore = new Map<string, OAuthClient>(); // clientId -> OAuthClient
const userStore = new Map<string, User>(); // id -> User

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
  findActiveConnectionsByUser: async () => [],
  updateLastUsedAt: async () => {},
}));

mock.module("@/infrastructure/repositories/oauthClientRepository", () => ({
  create: async (data: {
    clientId: string;
    clientName: string;
    redirectUris: string[];
    tokenEndpointAuthMethod?: string;
    grantTypes: string[];
    responseTypes: string[];
  }) => {
    const client: OAuthClient = {
      id: randomUUID(),
      clientId: data.clientId,
      clientName: data.clientName,
      redirectUris: data.redirectUris,
      tokenEndpointAuthMethod: data.tokenEndpointAuthMethod ?? "none",
      grantTypes: data.grantTypes,
      responseTypes: data.responseTypes,
      clientIdIssuedAt: new Date(),
      createdAt: new Date(),
    };
    clientStore.set(data.clientId, client);
    return client;
  },
  findByClientId: async (clientId: string) => clientStore.get(clientId) ?? null,
}));

mock.module("@/infrastructure/repositories/userRepository", () => ({
  findById: async (id: string, _organizationId: string) => userStore.get(id) ?? null,
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

// ---- ルートとユースケースをインポート ----

const { POST } = await import("../../app/api/mcp/route");
const { registerOAuthClient } = await import("@/application/usecases/registerOAuthClient");
const { authorizeOAuthClient } = await import("@/application/usecases/authorizeOAuthClient");
const { exchangeOAuthToken } = await import("@/application/usecases/exchangeOAuthToken");

// ---- テスト定数 ----

const USER_ID = "user-bearer-1";
const ORG_ID = "org-bearer-1";
const REDIRECT_URI = "http://localhost:3000/callback";

/** テストユーザーを userStore に登録する。 */
function seedUser(userId: string = USER_ID, orgId: string = ORG_ID): User {
  const user: User = {
    id: userId,
    email: "bearer-test@example.com",
    name: "Bearer Test User",
    organizationId: orgId,
    role: "member",
    notificationsLastSeenAt: null,
    createdAt: new Date(),
    deactivatedAt: null,
  };
  userStore.set(userId, user);
  return user;
}

/** MCP initialize リクエストを組み立てる。 */
function buildInitializeRequest(accessToken: string): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.1.0" },
      },
    }),
  });
}

/** PKCE: verifier → challenge (S256) */
function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

beforeEach(() => {
  tokenStore.clear();
  clientStore.clear();
  userStore.clear();
});

// ---- TC-020: 有効トークン → MCP 200 ----

describe("TC-020: 有効な oat_ トークンは MCP 200 を返す", () => {
  it("有効な oat_ アクセストークンで MCP initialize が 200 を返す", async () => {
    seedUser();

    const plainAt = generateOAuthAccessToken();
    const atHash = hashOAuthToken(plainAt);
    tokenStore.set(
      atHash,
      createTokenRecord({
        type: "access_token",
        clientId: randomUUID(),
        userId: USER_ID,
        organizationId: ORG_ID,
        tokenHash: atHash,
        tokenPrefix: toOAuthTokenDisplayPrefix(plainAt),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
      })
    );

    const response = await POST(buildInitializeRequest(plainAt));
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      result?: { serverInfo?: { name?: string } };
      error?: unknown;
    };
    expect(body.error).toBeUndefined();
    expect(body.result?.serverInfo?.name).toBe("clearflow");
  });
});

// ---- TC-021: 失効済みトークン → MCP 401 ----

describe("TC-021: 失効済みの oat_ トークンは MCP 401 を返す", () => {
  it("revokedAt が設定されたアクセストークンは 401 を返す", async () => {
    seedUser();

    const plainAt = generateOAuthAccessToken();
    const atHash = hashOAuthToken(plainAt);
    const revokedToken = createTokenRecord({
      type: "access_token",
      clientId: randomUUID(),
      userId: USER_ID,
      organizationId: ORG_ID,
      tokenHash: atHash,
      tokenPrefix: toOAuthTokenDisplayPrefix(plainAt),
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
    });
    // 失効（接続解除を模倣）
    tokenStore.set(atHash, { ...revokedToken, revokedAt: new Date() });

    const response = await POST(buildInitializeRequest(plainAt));
    expect(response.status).toBe(401);
  });

  it("接続解除による系列失効後のアクセストークンは 401 を返す", async () => {
    seedUser();

    const familyId = randomUUID();
    const plainAt = generateOAuthAccessToken();
    const atHash = hashOAuthToken(plainAt);
    tokenStore.set(
      atHash,
      createTokenRecord({
        type: "access_token",
        clientId: randomUUID(),
        userId: USER_ID,
        organizationId: ORG_ID,
        tokenHash: atHash,
        tokenPrefix: toOAuthTokenDisplayPrefix(plainAt),
        familyId,
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
      })
    );

    // revokeByFamilyId による系列全失効をシミュレート
    for (const [hash, token] of tokenStore.entries()) {
      if (token.familyId === familyId) {
        tokenStore.set(hash, { ...token, revokedAt: new Date() });
      }
    }

    const response = await POST(buildInitializeRequest(plainAt));
    expect(response.status).toBe(401);
  });
});

// ---- TC-022: 期限切れトークン → MCP 401 ----

describe("TC-022: 期限切れの oat_ トークンは MCP 401 を返す", () => {
  it("expiresAt が過去のアクセストークンは 401 を返す", async () => {
    seedUser();

    const plainAt = generateOAuthAccessToken();
    const atHash = hashOAuthToken(plainAt);
    tokenStore.set(
      atHash,
      createTokenRecord({
        type: "access_token",
        clientId: randomUUID(),
        userId: USER_ID,
        organizationId: ORG_ID,
        tokenHash: atHash,
        tokenPrefix: toOAuthTokenDisplayPrefix(plainAt),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() - 1000), // 期限切れ
      })
    );

    const response = await POST(buildInitializeRequest(plainAt));
    expect(response.status).toBe(401);
  });
});

// ---- TC-049: 一連のフロー（登録→認可→トークン交換→MCP アクセス）----

describe("TC-049: 一連のフロー（登録→認可→トークン交換→MCP アクセス）", () => {
  it("正規の OAuth フローで取得した oat_ トークンで MCP にアクセスできる", async () => {
    seedUser();

    const verifier = "integration-verifier-0123456789012345678";
    const challenge = pkceChallenge(verifier);

    // Step 1: クライアント動的登録
    const regResult = await registerOAuthClient({
      clientName: "Integration Test Client",
      redirectUris: [REDIRECT_URI],
      grantTypes: ["authorization_code", "refresh_token"],
      responseTypes: ["code"],
      tokenEndpointAuthMethod: "none",
    });
    expect(regResult.ok).toBe(true);
    if (!regResult.ok) return;

    // Step 2: PKCE 認可コード発行（ユーザーが同意）
    const authResult = await authorizeOAuthClient({
      clientId: regResult.client.clientId,
      redirectUri: REDIRECT_URI,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      state: "integration-state",
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    expect(authResult.ok).toBe(true);
    if (!authResult.ok) return;

    // Step 3: 認可コード → アクセストークン + リフレッシュトークン交換
    const tokenResult = await exchangeOAuthToken({
      grantType: "authorization_code",
      code: authResult.code,
      redirectUri: REDIRECT_URI,
      clientId: regResult.client.clientId,
      codeVerifier: verifier,
    });
    expect(tokenResult.ok).toBe(true);
    if (!tokenResult.ok) return;
    expect(tokenResult.accessToken.startsWith("oat_")).toBe(true);

    // Step 4: 取得した oat_ トークンで MCP エンドポイントにアクセス
    const mcpResponse = await POST(buildInitializeRequest(tokenResult.accessToken));
    expect(mcpResponse.status).toBe(200);

    const body = (await mcpResponse.json()) as {
      result?: { serverInfo?: { name?: string } };
      error?: unknown;
    };
    expect(body.error).toBeUndefined();
    expect(body.result?.serverInfo?.name).toBe("clearflow");
  });

  it("リフレッシュトークンローテーション後の新アクセストークンでも MCP にアクセスできる", async () => {
    seedUser();

    const verifier = "rotation-verifier-0123456789012345678901";
    const challenge = pkceChallenge(verifier);

    const regResult = await registerOAuthClient({
      clientName: "Rotation Test Client",
      redirectUris: [REDIRECT_URI],
    });
    expect(regResult.ok).toBe(true);
    if (!regResult.ok) return;

    const authResult = await authorizeOAuthClient({
      clientId: regResult.client.clientId,
      redirectUri: REDIRECT_URI,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      state: null,
      userId: USER_ID,
      organizationId: ORG_ID,
    });
    expect(authResult.ok).toBe(true);
    if (!authResult.ok) return;

    const first = await exchangeOAuthToken({
      grantType: "authorization_code",
      code: authResult.code,
      redirectUri: REDIRECT_URI,
      clientId: regResult.client.clientId,
      codeVerifier: verifier,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // リフレッシュトークンローテーション
    const second = await exchangeOAuthToken({
      grantType: "refresh_token",
      refreshToken: first.refreshToken,
      clientId: regResult.client.clientId,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // 新しいアクセストークンで MCP アクセス
    const mcpResponse = await POST(buildInitializeRequest(second.accessToken));
    expect(mcpResponse.status).toBe(200);
  });
});
