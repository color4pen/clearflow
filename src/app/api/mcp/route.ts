import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { resolveBearer } from "@/infrastructure/apiTokenResolver";
import { registerInquiriesTools } from "./tools/inquiries";
import { registerDealsTools } from "./tools/deals";
import { registerClientsTools } from "./tools/clients";

/**
 * リクエストごとに新しい McpServer + transport を生成する（stateless）。
 * McpServer は 1 つの transport にしか connect できず、stateless(JSON) パスでは
 * transport が close されないため、モジュールレベルで使い回すと 2 リクエスト目以降
 * "Already connected to a transport" で失敗する。よって毎リクエスト生成する。
 */
function createMcpServer(): McpServer {
  const server = new McpServer({ name: "clearflow", version: "1.0.0" });
  registerInquiriesTools(server);
  registerDealsTools(server);
  registerClientsTools(server);
  return server;
}

function getProtectedResourceMetadataUrl(request: Request): string {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl) {
    return `${authUrl.replace(/\/$/, "")}/.well-known/oauth-protected-resource`;
  }
  const host = request.headers.get("host") ?? "localhost";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/.well-known/oauth-protected-resource`;
}

/** Bearer 認証を検証し、authInfo を構築する。失敗時は 401 Response を返す。 */
async function authenticate(
  request: Request
): Promise<{ authInfo: AuthInfo } | { response: Response }> {
  const authHeader = request.headers.get("Authorization");
  const resolved = await resolveBearer(authHeader);
  if (!resolved) {
    const resourceMetadataUrl = getProtectedResourceMetadataUrl(request);
    return {
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
        },
      }),
    };
  }
  return {
    authInfo: {
      token: authHeader!.slice("Bearer ".length),
      clientId: resolved.userId,
      scopes: [],
      extra: {
        userId: resolved.userId,
        organizationId: resolved.organizationId,
        role: resolved.role,
      },
    },
  };
}

/** transport を生成し、リクエストを処理する。例外は JSON-RPC エラーに包む。 */
async function handleWithServer(
  request: Request,
  options?: { authInfo: AuthInfo }
): Promise<Response> {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(request, options);
  } catch {
    // トランスポート/接続レベルの例外を素の 500 にせず JSON-RPC エラーで返す
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await transport.close();
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  return handleWithServer(request, { authInfo: auth.authInfo });
}

export async function GET(request: Request): Promise<Response> {
  // POST と同じ Bearer 認証（SDK バージョンアップ時の認証バイパスリスクを防ぐ）。
  // stateless モードでは GET は 405 を返す（SDK が処理する）。
  const auth = await authenticate(request);
  if ("response" in auth) return auth.response;
  return handleWithServer(request);
}
