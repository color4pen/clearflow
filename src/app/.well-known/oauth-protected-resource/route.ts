/** RFC 9728: Protected Resource Metadata */

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
    resource: `${base}/api/mcp`,
    authorization_servers: [`${base}`],
    bearer_methods_supported: ["header"],
  };

  return Response.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
