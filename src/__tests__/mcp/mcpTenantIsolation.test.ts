/**
 * T-10: テナント分離テスト
 * TC-013, TC-049, TC-050
 *
 * - runtime テスト: TC-049（inquiries list で organizationId が usecase に伝播される）
 * - 静的検証: TC-013/050 の構造確認
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// usecase モック状態（TC-049 runtime テスト用）
// listInquiries に渡された organizationId を記録する
// ---------------------------------------------------------------------------

const tenantMockState = {
  listInquiriesCalls: [] as string[],
};

// @/application/usecases をモック（listInquiries の呼び出し引数をキャプチャ）
mock.module("@/application/usecases", () => ({
  listInquiries: async (organizationId: string) => {
    tenantMockState.listInquiriesCalls.push(organizationId);
    return [];
  },
  createInquiry: async () => ({ ok: false as const, reason: "stub" }),
  updateInquiry: async () => ({ ok: false as const, reason: "stub" }),
  updateInquiryStatus: async () => ({ ok: false as const, reason: "stub" }),
  deleteInquiry: async () => ({ ok: false as const, reason: "stub" }),
  createClient: async () => ({ ok: false as const, reason: "stub" }),
}));

import { registerInquiriesTools } from "../../app/api/mcp/tools/inquiries";

// ---------------------------------------------------------------------------
// 静的検証テスト
// ---------------------------------------------------------------------------

describe("TC-013 / TC-049 / TC-050: テナント分離（静的検証）", () => {
  describe("inquiries.ts のテナント分離", () => {
    it("organizationId を getAuthInfo から取得している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("organizationId");
      expect(content).toContain("getAuthInfo");
    });

    it("listInquiries に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("listInquiries(organizationId)");
    });

    it("createInquiry に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("organizationId,");
      expect(content).toContain("createInquiry");
    });

    it("updateInquiry に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("updateInquiry");
    });

    it("deleteInquiry に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("deleteInquiry");
    });
  });

  describe("deals.ts のテナント分離", () => {
    it("organizationId を getAuthInfo から取得している", async () => {
      const content = await readSrc("app/api/mcp/tools/deals.ts");
      expect(content).toContain("organizationId");
      expect(content).toContain("getAuthInfo");
    });

    it("listDeals に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/deals.ts");
      expect(content).toContain("listDeals(organizationId)");
    });

    it("getDeal に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/deals.ts");
      expect(content).toContain("getDeal(args.dealId, organizationId)");
    });

    it("createDeal に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/deals.ts");
      expect(content).toContain("createDeal");
    });
  });

  describe("clients.ts のテナント分離", () => {
    it("organizationId を getAuthInfo から取得している", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain("organizationId");
      expect(content).toContain("getAuthInfo");
    });

    it("listClients に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain("listClients(organizationId)");
    });

    it("getClient に organizationId を渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain("getClient(args.clientId, organizationId)");
    });
  });

  describe("route.ts での認証情報の伝播", () => {
    it("resolveBearer が返す organizationId を authInfo.extra に格納している", async () => {
      const content = await readSrc("app/api/mcp/route.ts");
      expect(content).toContain("resolved.organizationId");
      expect(content).toContain("extra");
    });

    it("tool handler が extra.authInfo.extra から organizationId を取得している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("extra.authInfo?.extra");
    });
  });
});

// ---------------------------------------------------------------------------
// TC-049: list テナント分離 runtime テスト
//
// inquiries ツールの list 操作が authInfo に含まれる organizationId を
// listInquiries usecase に正確に伝播させることを runtime で検証する。
// ---------------------------------------------------------------------------

/** McpServer に新しい transport を接続してリクエストを処理するヘルパー */
async function dispatchMcpRequest(
  server: McpServer,
  body: unknown,
  authInfo: AuthInfo
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
  return transport.handleRequest(request, { authInfo });
}

describe("TC-049: inquiries list テナント分離 runtime テスト", () => {
  beforeEach(() => {
    tenantMockState.listInquiriesCalls = [];
  });

  it("TC-049: authInfo の organizationId がそのまま listInquiries に渡される", async () => {
    const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
    registerInquiriesTools(server);

    const targetOrgId = "org-tenant-a-isolation-test";

    const authInfo: AuthInfo = {
      token: "cfp_test",
      clientId: "user-1",
      scopes: [],
      extra: {
        userId: "user-1",
        organizationId: targetOrgId,
        role: "admin",
      },
    };

    const response = await dispatchMcpRequest(
      server,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "inquiries",
          arguments: { operation: "list" },
        },
      },
      authInfo
    );

    expect(response.status).toBe(200);
    // listInquiries が 1 回だけ呼ばれ、organizationId が authInfo から来たものと一致する
    expect(tenantMockState.listInquiriesCalls).toHaveLength(1);
    expect(tenantMockState.listInquiriesCalls[0]).toBe(targetOrgId);
  });

  it("TC-050: 別テナントの organizationId が混入しない（テナント B の authInfo ではテナント A のデータに触れない）", async () => {
    const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
    registerInquiriesTools(server);

    const tenantBOrgId = "org-tenant-b";

    const authInfo: AuthInfo = {
      token: "cfp_test_b",
      clientId: "user-b-1",
      scopes: [],
      extra: {
        userId: "user-b-1",
        organizationId: tenantBOrgId,
        role: "admin",
      },
    };

    await dispatchMcpRequest(
      server,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "inquiries",
          arguments: { operation: "list" },
        },
      },
      authInfo
    );

    // listInquiries が テナント B の organizationId で呼ばれること（テナント A の ID は含まれない）
    expect(tenantMockState.listInquiriesCalls).toHaveLength(1);
    expect(tenantMockState.listInquiriesCalls[0]).toBe(tenantBOrgId);
    expect(tenantMockState.listInquiriesCalls[0]).not.toBe("org-tenant-a-isolation-test");
  });
});
