import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { resolveBearer } from "@/infrastructure/apiTokenResolver";
import { registerInquiriesTools } from "./tools/inquiries";
import { registerDealsTools } from "./tools/deals";
import { registerClientsTools } from "./tools/clients";

/**
 * MCP サーバーインスタンス（モジュールレベルシングルトン）。
 * ツール登録はモジュールロード時に 1 回だけ行う。
 * transport はリクエストごとに生成する（D8）。
 */
const mcpServer = new McpServer({
  name: "clearflow",
  version: "1.0.0",
});

registerInquiriesTools(mcpServer);
registerDealsTools(mcpServer);
registerClientsTools(mcpServer);

export async function POST(request: Request): Promise<Response> {
  // (1) Bearer 認証
  const authHeader = request.headers.get("Authorization");
  const resolved = await resolveBearer(authHeader);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // (2) authInfo を構築する（D6: AuthInfo の extra に userId/organizationId/role を格納）
  const authInfo: AuthInfo = {
    token: authHeader!.slice("Bearer ".length),
    clientId: resolved.userId,
    scopes: [],
    extra: {
      userId: resolved.userId,
      organizationId: resolved.organizationId,
      role: resolved.role,
    },
  };

  // (3) stateless transport を生成する（D2, D5）
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // (4) transport を McpServer に接続する
  await mcpServer.connect(transport);

  // (5) リクエストを処理する
  return transport.handleRequest(request, { authInfo });
}

export async function GET(request: Request): Promise<Response> {
  // stateless モードでは GET は 405 を返す（SDK が処理する）
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await mcpServer.connect(transport);
  return transport.handleRequest(request);
}
