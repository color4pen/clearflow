/**
 * TC-006: authorize ルートの未ログイン→ログインリダイレクトテスト
 *
 * - 未ログイン → /login?callbackUrl=... へのリダイレクトをテストで固定する（TC-006, must）
 * - ログイン済み → /oauth/consent へのリダイレクトを確認する
 *
 * auth() と next/headers cookies() をモックして GET ルートを直接 import して実行する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { randomUUID } from "crypto";
import type { OAuthClient } from "@/domain/models/oauthClient";

// ---- モック状態 ----

/** 現在のセッション（null = 未ログイン）。テストごとに切り替える。 */
let currentSession: { user: { id: string; organizationId: string } } | null = null;

/** 現在のモッククライアント（null = クライアント未登録）。テストごとに切り替える。 */
let currentClient: OAuthClient | null = null;

/** モック Cookie ストアのデータ。テストごとにリセットする。 */
const cookieData = new Map<string, string>();

// ---- モック設定（インポート前に設定する） ----

mock.module("@/infrastructure/auth", () => ({
  auth: async () => currentSession,
}));

mock.module("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      set: (name: string, value: string, _options?: unknown) => {
        cookieData.set(name, value);
      },
      get: (name: string) => {
        const value = cookieData.get(name);
        return value !== undefined ? { name, value } : undefined;
      },
      delete: (name: string) => {
        cookieData.delete(name);
      },
    }),
}));

mock.module("next/navigation", () => ({
  redirect: (_url: string) => {
    throw new Error("redirect() called unexpectedly");
  },
}));

mock.module("@/infrastructure/repositories/oauthClientRepository", () => ({
  findByClientId: async (_clientId: string) => currentClient,
  create: async () => {
    throw new Error("create() not expected in authorize route tests");
  },
}));

// authorize ルートのインポートは、モック設定後に行う
const { GET } = await import("../../app/api/oauth/authorize/route");

// ---- テスト定数 ----

const TEST_CLIENT_ID = "test-client-" + randomUUID();
const REDIRECT_URI = "http://localhost:3000/callback";

/** 有効なOAuthクライアントを生成する。 */
function makeTestClient(): OAuthClient {
  return {
    id: randomUUID(),
    clientId: TEST_CLIENT_ID,
    clientName: "Test OAuth Client",
    redirectUris: [REDIRECT_URI],
    tokenEndpointAuthMethod: "none",
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    clientIdIssuedAt: new Date(),
    createdAt: new Date(),
  };
}

/** テスト用の authorize エンドポイント URL を組み立てる。 */
function buildAuthorizeUrl(overrides: Record<string, string | null> = {}): string {
  const params: Record<string, string | null> = {
    response_type: "code",
    client_id: TEST_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    code_challenge_method: "S256",
    state: "test-state-xyz",
    ...overrides,
  };

  const url = new URL("http://localhost/api/oauth/authorize");
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) url.searchParams.set(key, value);
  }
  return url.toString();
}

beforeEach(() => {
  currentSession = null;
  currentClient = makeTestClient();
  cookieData.clear();
});

// ---- TC-006: 未ログイン → ログインリダイレクト ----

describe("TC-006: authorize GET — 未ログイン時のリダイレクト", () => {
  it("セッションなし → /login?callbackUrl=... へ 302 リダイレクトする", async () => {
    currentSession = null;

    const requestUrl = buildAuthorizeUrl();
    const request = new Request(requestUrl);
    const response = await GET(request);

    expect(response.status).toBe(302);

    const location = response.headers.get("Location");
    expect(location).not.toBeNull();
    expect(location).toContain("/login");
    expect(location).toContain("callbackUrl");
  });

  it("callbackUrl に認可エンドポイント URL が含まれる", async () => {
    currentSession = null;

    const requestUrl = buildAuthorizeUrl();
    const request = new Request(requestUrl);
    const response = await GET(request);

    const location = response.headers.get("Location") ?? "";
    const locationUrl = new URL(location);
    const callbackUrl = locationUrl.searchParams.get("callbackUrl");

    expect(callbackUrl).not.toBeNull();
    expect(callbackUrl).toContain("/api/oauth/authorize");
  });

  it("OAuth パラメータが Cookie に保存されてからリダイレクトする", async () => {
    currentSession = null;

    const requestUrl = buildAuthorizeUrl();
    const request = new Request(requestUrl);
    await GET(request);

    // Cookie にパラメータが保存されている
    expect(cookieData.has("oauth_pending_params")).toBe(true);
    const saved = JSON.parse(cookieData.get("oauth_pending_params")!);
    expect(saved.clientId).toBe(TEST_CLIENT_ID);
    expect(saved.redirectUri).toBe(REDIRECT_URI);
    expect(saved.codeChallengeMethod).toBe("S256");
  });
});

// ---- ログイン済み → 同意画面リダイレクト ----

describe("authorize GET — ログイン済み時のリダイレクト", () => {
  it("セッションあり → /oauth/consent へ 302 リダイレクトする", async () => {
    currentSession = { user: { id: "user-1", organizationId: "org-1" } };

    const requestUrl = buildAuthorizeUrl();
    const request = new Request(requestUrl);
    const response = await GET(request);

    expect(response.status).toBe(302);

    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("/oauth/consent");
  });

  it("ログイン済みでも OAuth パラメータが Cookie に保存される", async () => {
    currentSession = { user: { id: "user-1", organizationId: "org-1" } };

    const requestUrl = buildAuthorizeUrl();
    const request = new Request(requestUrl);
    await GET(request);

    expect(cookieData.has("oauth_pending_params")).toBe(true);
    const saved = JSON.parse(cookieData.get("oauth_pending_params")!);
    expect(saved.clientId).toBe(TEST_CLIENT_ID);
  });
});

// ---- パラメータバリデーション ----

describe("authorize GET — パラメータバリデーション", () => {
  it("redirect_uri がない場合は 400 を返す", async () => {
    const url = new URL("http://localhost/api/oauth/authorize");
    url.searchParams.set("client_id", TEST_CLIENT_ID);
    url.searchParams.set("response_type", "code");
    const response = await GET(new Request(url.toString()));
    expect(response.status).toBe(400);
  });

  it("未登録の client_id は 400 を返す", async () => {
    currentClient = null;

    const requestUrl = buildAuthorizeUrl({ client_id: "unknown-client-xyz" });
    const response = await GET(new Request(requestUrl));
    expect(response.status).toBe(400);
  });

  it("PKCE code_challenge がない場合は redirect_uri にエラーを付けてリダイレクトする", async () => {
    const requestUrl = buildAuthorizeUrl({ code_challenge: null });
    const response = await GET(new Request(requestUrl));
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("error=invalid_request");
  });

  it("code_challenge_method が S256 以外は redirect_uri にエラーを付けてリダイレクトする", async () => {
    const requestUrl = buildAuthorizeUrl({ code_challenge_method: "plain" });
    const response = await GET(new Request(requestUrl));
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location).toContain("error=invalid_request");
  });
});
