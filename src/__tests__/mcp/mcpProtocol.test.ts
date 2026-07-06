/**
 * T-07: プロトコルレベル統合テスト
 * TC-001, TC-025, TC-026, TC-027, TC-028
 *
 * - runtime テスト: TC-001（initialize → tools/list → tools/call フロー）
 * - 静的検証: TC-025/026/027/028 の構造確認
 */

import { describe, it, expect } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("MCP プロトコルレベル統合テスト（静的検証）", () => {
  describe("TC-025: serverInfo が設定されている", () => {
    it("route.ts に clearflow の serverInfo が含まれる", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain('"clearflow"');
      expect(content).toContain('"1.0.0"');
    });

    it("McpServer が McpServer クラスで生成されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("new McpServer");
    });
  });

  describe("TC-026: tools/list に 3 ツールが含まれる", () => {
    it("route.ts に inquiries / deals / clients の 3 ツールが登録されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("registerInquiriesTools");
      expect(content).toContain("registerDealsTools");
      expect(content).toContain("registerClientsTools");
    });

    it("inquiries.ts が 'inquiries' ツールを登録している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain('"inquiries"');
      expect(content).toContain("registerTool");
    });

    it("deals.ts が 'deals' ツールを登録している", async () => {
      const content = await readSrc("app/api/mcp/tools/deals.ts");
      expect(content).toContain('"deals"');
      expect(content).toContain("registerTool");
    });

    it("clients.ts が 'clients' ツールを登録している", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain('"clients"');
      expect(content).toContain("registerTool");
    });
  });

  describe("TC-001: initialize → tools/list → tools/call の交換", () => {
    it("route.ts に POST ハンドラが export されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("export async function POST");
    });

    it("WebStandardStreamableHTTPServerTransport が使用されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("WebStandardStreamableHTTPServerTransport");
    });

    it("stateless モード（sessionIdGenerator: undefined）で transport が生成されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("sessionIdGenerator: undefined");
    });

    it("enableJsonResponse: true が設定されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("enableJsonResponse: true");
    });
  });

  describe("TC-002: POST 以外のメソッド", () => {
    it("route.ts に GET ハンドラが export されている", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("export async function GET");
    });
  });

  describe("TC-027 / TC-028: 不正な入力のエラー処理", () => {
    it("inquiries.ts にエラーハンドリングが含まれる", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("handleToolError");
      expect(content).toContain("toToolError");
    });

    it("deals.ts にエラーハンドリングが含まれる", async () => {
      const content = await readSrc("app/api/mcp/tools/deals.ts");
      expect(content).toContain("handleToolError");
      expect(content).toContain("toToolError");
    });

    it("clients.ts にエラーハンドリングが含まれる", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain("handleToolError");
      expect(content).toContain("toToolError");
    });
  });
});

/**
 * TC-001: initialize → tools/list → tools/call の runtime テスト
 *
 * McpServer + WebStandardStreamableHTTPServerTransport を直接生成し、
 * JSON-RPC メッセージを handleRequest に送って応答を検証する。
 * usecase への依存を持たないテスト用ツールを登録するため、DB 接続不要。
 */

/** テスト用 McpServer を生成する（ツール登録込み） */
function createTestMcpServer(): McpServer {
  const server = new McpServer({
    name: "clearflow-test",
    version: "1.0.0",
  });

  server.registerTool(
    "echo",
    {
      description: "入力メッセージをそのまま返すテスト用ツール",
      inputSchema: z.object({ message: z.string() }),
    },
    async (args) => ({
      content: [{ type: "text" as const, text: `echo: ${args.message}` }],
    })
  );

  return server;
}

/** McpServer に新しい transport を接続してリクエストを処理する */
async function dispatchRequest(
  server: McpServer,
  body: unknown,
  authInfo?: AuthInfo
): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const request = new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
  return transport.handleRequest(request, authInfo ? { authInfo } : undefined);
}

describe("TC-001: initialize → tools/list → tools/call runtime テスト", () => {
  // テスト用の authInfo（resolveBearer を通さず直接構築）
  const testAuthInfo: AuthInfo = {
    token: "cfp_test_token",
    clientId: "user-test-1",
    scopes: [],
    extra: {
      userId: "user-test-1",
      organizationId: "org-test-1",
      role: "admin",
    },
  };

  it("TC-001a: initialize が 200 と protocolVersion を返す", async () => {
    const server = createTestMcpServer();
    const response = await dispatchRequest(
      server,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "0.1.0" },
        },
      },
      testAuthInfo
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result?: { protocolVersion?: string; serverInfo?: { name: string } };
    };
    expect(body.result?.protocolVersion).toBeTruthy();
    expect(body.result?.serverInfo?.name).toBe("clearflow-test");
  });

  it("TC-001b: tools/list がテスト用ツールの一覧を返す", async () => {
    const server = createTestMcpServer();
    const response = await dispatchRequest(
      server,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      },
      testAuthInfo
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result?: { tools?: Array<{ name: string; description?: string }> };
    };
    const tools = body.result?.tools ?? [];
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("echo");
  });

  it("TC-001c: tools/call が echo ツールを呼び出して結果を返す", async () => {
    const server = createTestMcpServer();
    const response = await dispatchRequest(
      server,
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "echo",
          arguments: { message: "hello MCP" },
        },
      },
      testAuthInfo
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result?: { content?: Array<{ type: string; text: string }> };
    };
    expect(body.result?.content?.[0]?.text).toBe("echo: hello MCP");
  });

  it("TC-001d: 不正な JSON-RPC method が -32601 エラーを返す", async () => {
    const server = createTestMcpServer();
    const response = await dispatchRequest(
      server,
      {
        jsonrpc: "2.0",
        id: 4,
        method: "unknown/method",
        params: {},
      },
      testAuthInfo
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      error?: { code?: number };
    };
    expect(body.error?.code).toBe(-32601);
  });
});
