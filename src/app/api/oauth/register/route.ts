import { headers } from "next/headers";
import { registerOAuthClient } from "@/application/usecases/registerOAuthClient";
import { checkRateLimit } from "@/infrastructure/rateLimit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request): Promise<Response> {
  // IP アドレスでレート制限チェック（10 件/時間）
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";

  const rateLimitResult = await checkRateLimit({
    key: `oauth_register:${ip}`,
    limit: 10,
    windowMs: 3_600_000, // 1 hour
  });

  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: "rate_limit_exceeded", error_description: "Too many registration requests" },
      {
        status: 429,
        headers: CORS_HEADERS,
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "Request body must be valid JSON" },
      {
        status: 400,
        headers: CORS_HEADERS,
      }
    );
  }

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "invalid_request", error_description: "Request body must be a JSON object" },
      {
        status: 400,
        headers: CORS_HEADERS,
      }
    );
  }

  const data = body as Record<string, unknown>;

  const clientName = typeof data.client_name === "string" ? data.client_name : "";
  const redirectUris = Array.isArray(data.redirect_uris)
    ? (data.redirect_uris as unknown[]).filter((u) => typeof u === "string") as string[]
    : [];
  const grantTypes = Array.isArray(data.grant_types)
    ? (data.grant_types as unknown[]).filter((g) => typeof g === "string") as string[]
    : undefined;
  const responseTypes = Array.isArray(data.response_types)
    ? (data.response_types as unknown[]).filter((r) => typeof r === "string") as string[]
    : undefined;
  const tokenEndpointAuthMethod =
    typeof data.token_endpoint_auth_method === "string"
      ? data.token_endpoint_auth_method
      : undefined;

  const result = await registerOAuthClient({
    clientName,
    redirectUris,
    grantTypes,
    responseTypes,
    tokenEndpointAuthMethod,
  });

  if (!result.ok) {
    return Response.json(
      { error: "invalid_client_metadata", error_description: result.reason },
      {
        status: 400,
        headers: CORS_HEADERS,
      }
    );
  }

  const { client } = result;
  return Response.json(
    {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      client_id_issued_at: Math.floor(client.clientIdIssuedAt.getTime() / 1000),
    },
    {
      status: 201,
      headers: CORS_HEADERS,
    }
  );
}
