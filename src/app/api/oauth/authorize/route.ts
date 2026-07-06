import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { oauthClientRepository } from "@/infrastructure/repositories";
import { authorizeOAuthClient } from "@/application/usecases/authorizeOAuthClient";

/** OAuth 認可パラメータを一時 Cookie に保存するためのキー。 */
const OAUTH_PARAMS_COOKIE = "oauth_pending_params";
const OAUTH_PARAMS_MAX_AGE = 600; // 10 minutes

type OAuthPendingParams = {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | null;
  resource?: string | null;
};

function buildErrorRedirect(redirectUri: string, error: string, state: string | null): URL {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  return url;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const state = url.searchParams.get("state");
  const resource = url.searchParams.get("resource");

  // redirect_uri が不正な場合はリダイレクトせずに 400 を返す
  if (!redirectUri) {
    return new Response("Bad Request: redirect_uri is required", { status: 400 });
  }

  let redirectUriParsed: URL;
  try {
    redirectUriParsed = new URL(redirectUri);
  } catch {
    return new Response("Bad Request: redirect_uri is not a valid URL", { status: 400 });
  }

  // client_id が必須
  if (!clientId) {
    return Response.redirect(buildErrorRedirect(redirectUriParsed.toString(), "invalid_request", state).toString());
  }

  // クライアントが存在するか確認
  const client = await oauthClientRepository.findByClientId(clientId);
  if (!client) {
    // クライアントが不明な場合はリダイレクトしない（RFC 9700 §4.1.2.1）
    return new Response("Bad Request: unknown client_id", { status: 400 });
  }

  // redirectUri がクライアントの登録済み redirectUris に含まれるか
  if (!client.redirectUris.includes(redirectUri)) {
    // 未登録の redirect_uri へはリダイレクトしない（オープンリダイレクト防止）
    return new Response("Bad Request: redirect_uri is not registered for this client", { status: 400 });
  }

  // response_type=code のみサポート
  if (responseType !== "code") {
    return Response.redirect(
      buildErrorRedirect(redirectUri, "unsupported_response_type", state).toString()
    );
  }

  // PKCE 必須
  if (!codeChallenge) {
    return Response.redirect(
      buildErrorRedirect(redirectUri, "invalid_request", state).toString()
    );
  }

  if (codeChallengeMethod !== "S256") {
    return Response.redirect(
      buildErrorRedirect(redirectUri, "invalid_request", state).toString()
    );
  }

  // セッション確認
  const session = await auth();

  // OAuth パラメータを Cookie に保存
  const pendingParams: OAuthPendingParams = {
    clientId,
    redirectUri,
    responseType,
    codeChallenge,
    codeChallengeMethod,
    state,
    resource,
  };

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_PARAMS_COOKIE, JSON.stringify(pendingParams), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_PARAMS_MAX_AGE,
    path: "/",
  });

  if (!session?.user?.id) {
    // 未ログイン: ログインページへリダイレクト（callbackUrl で認可フローへ戻る）
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return Response.redirect(loginUrl.toString());
  }

  // ログイン済み: 同意画面へリダイレクト
  return Response.redirect(new URL("/oauth/consent", request.url).toString());
}

export async function POST(request: Request): Promise<Response> {
  // セッション確認
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Cookie から OAuth パラメータを復元してバリデーション
  const cookieStore = await cookies();
  const rawParams = cookieStore.get(OAUTH_PARAMS_COOKIE)?.value;
  if (!rawParams) {
    return new Response("Bad Request: authorization session expired", { status: 400 });
  }

  let params: OAuthPendingParams;
  try {
    params = JSON.parse(rawParams) as OAuthPendingParams;
  } catch {
    return new Response("Bad Request: invalid authorization session", { status: 400 });
  }

  // Cookie を削除
  cookieStore.delete(OAUTH_PARAMS_COOKIE);

  const formData = await request.formData();
  const action = formData.get("action");

  // 拒否の場合
  if (action === "deny") {
    const errorUrl = buildErrorRedirect(params.redirectUri, "access_denied", params.state);
    return Response.redirect(errorUrl.toString());
  }

  // 許可の場合
  if (action !== "allow") {
    return new Response("Bad Request: invalid action", { status: 400 });
  }

  const result = await authorizeOAuthClient({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    state: params.state,
    userId: session.user.id,
    organizationId: session.user.organizationId,
  });

  if (!result.ok) {
    const errorMap: Record<string, string> = {
      invalid_request: "invalid_request",
      unauthorized_client: "unauthorized_client",
      access_denied: "access_denied",
    };
    const errorUrl = buildErrorRedirect(
      params.redirectUri,
      errorMap[result.error] ?? "server_error",
      params.state
    );
    return Response.redirect(errorUrl.toString());
  }

  // 認可コードを redirect_uri に付けてリダイレクト
  const successUrl = new URL(params.redirectUri);
  successUrl.searchParams.set("code", result.code);
  if (result.state) successUrl.searchParams.set("state", result.state);

  return Response.redirect(successUrl.toString());
}
