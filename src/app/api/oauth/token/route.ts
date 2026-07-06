import { exchangeOAuthToken } from "@/application/usecases/exchangeOAuthToken";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  ...CORS_HEADERS,
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request): Promise<Response> {
  // application/x-www-form-urlencoded を受け付ける
  let formData: URLSearchParams;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      formData = new URLSearchParams(text);
    } else {
      // JSON 形式も受け付ける（クライアントによっては JSON で送る場合あり）
      const body = await request.json() as Record<string, string>;
      formData = new URLSearchParams(Object.entries(body));
    }
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "Could not parse request body" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const grantType = formData.get("grant_type");

  if (!grantType) {
    return Response.json(
      { error: "invalid_request", error_description: "grant_type is required" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  if (grantType === "authorization_code") {
    const code = formData.get("code");
    const redirectUri = formData.get("redirect_uri");
    const clientId = formData.get("client_id");
    const codeVerifier = formData.get("code_verifier");

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return Response.json(
        {
          error: "invalid_request",
          error_description: "code, redirect_uri, client_id, and code_verifier are required",
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const result = await exchangeOAuthToken({
      grantType: "authorization_code",
      code,
      redirectUri,
      clientId,
      codeVerifier,
    });

    if (!result.ok) {
      return Response.json(
        { error: result.error },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    return Response.json(
      {
        access_token: result.accessToken,
        token_type: result.tokenType,
        expires_in: result.expiresIn,
        refresh_token: result.refreshToken,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }

  if (grantType === "refresh_token") {
    const refreshToken = formData.get("refresh_token");
    const clientId = formData.get("client_id");

    if (!refreshToken || !clientId) {
      return Response.json(
        {
          error: "invalid_request",
          error_description: "refresh_token and client_id are required",
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const result = await exchangeOAuthToken({
      grantType: "refresh_token",
      refreshToken,
      clientId,
    });

    if (!result.ok) {
      return Response.json(
        { error: result.error },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    return Response.json(
      {
        access_token: result.accessToken,
        token_type: result.tokenType,
        expires_in: result.expiresIn,
        refresh_token: result.refreshToken,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  }

  return Response.json(
    { error: "unsupported_grant_type", error_description: `Unsupported grant_type: ${grantType}` },
    { status: 400, headers: NO_CACHE_HEADERS }
  );
}
