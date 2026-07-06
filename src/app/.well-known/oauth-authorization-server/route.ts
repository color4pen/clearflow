/** RFC 8414: Authorization Server Metadata */

function getBaseUrl(request: Request): string {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl) {
    return authUrl.replace(/\/$/, "");
  }
  const host = request.headers.get("host") ?? "localhost";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function GET(request: Request): Promise<Response> {
  const base = getBaseUrl(request);

  const metadata = {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
  };

  return Response.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
