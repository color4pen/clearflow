/**
 * T-11: 承認フロー連携テスト
 * TC-011, TC-012, TC-053
 *
 * - runtime テスト: TC-011/012（inquiries update_status → converted の pending 分岐）
 * - 静的検証: TC-053 など構造確認
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
// モック状態（TC-011/012 runtime テスト用）
// updateInquiryStatus の返り値と呼び出し記録を制御する
// ---------------------------------------------------------------------------

type ApprovalMockMode = "pending" | "direct";

const approvalMockState = {
  mode: "direct" as ApprovalMockMode,
  updateInquiryStatusCalls: [] as Array<{
    inquiryId: string;
    organizationId: string;
    newStatus: string;
  }>,
};

// Zod の uuid 検証 (RFC 4122 準拠) を通過する有効な UUID
const INQUIRY_UUID = "550e8400-e29b-41d4-a716-446655440000";
const DEAL_UUID = "660e8400-e29b-41d4-a716-446655440001";
const mockInquiry = {
  id: INQUIRY_UUID,
  title: "テスト引合",
  status: "new",
  organizationId: "org-1",
};
const mockDeal = {
  id: DEAL_UUID,
  organizationId: "org-1",
  inquiryId: INQUIRY_UUID,
};

// @/application/usecases をモック（updateInquiryStatus の挙動を mode で切り替え）
mock.module("@/application/usecases", () => ({
  listInquiries: async () => [],
  createInquiry: async () => ({ ok: false as const, reason: "stub" }),
  updateInquiry: async () => ({ ok: false as const, reason: "stub" }),
  updateInquiryStatus: async (data: {
    inquiryId: string;
    organizationId: string;
    actorId: string;
    newStatus: string;
  }) => {
    approvalMockState.updateInquiryStatusCalls.push({
      inquiryId: data.inquiryId,
      organizationId: data.organizationId,
      newStatus: data.newStatus,
    });
    if (approvalMockState.mode === "pending") {
      return {
        ok: true as const,
        inquiry: mockInquiry,
        pendingApproval: { requestId: "req-pending-1" },
      };
    }
    return { ok: true as const, inquiry: mockInquiry, deal: mockDeal };
  },
  deleteInquiry: async () => ({ ok: false as const, reason: "stub" }),
  createClient: async () => ({ ok: false as const, reason: "stub" }),
}));

// @/infrastructure/rateLimit をモック（update_status は checkRateLimit を呼ぶため）
mock.module("@/infrastructure/rateLimit", () => ({
  RATE_LIMITS: {
    createRequest: { limit: 10, windowMs: 60_000 },
    approveReject: { limit: 30, windowMs: 60_000 },
    webhookManage: { limit: 10, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
  checkRateLimit: async () => ({ allowed: true, remaining: 9 }),
}));

import { registerInquiriesTools } from "../../app/api/mcp/tools/inquiries";

// ---------------------------------------------------------------------------
// 静的検証テスト
// ---------------------------------------------------------------------------

describe("TC-011 / TC-012: 承認フロー連携（静的検証）", () => {
  describe("inquiries.ts の update_status → converted ハンドラ", () => {
    it("updateInquiryStatus を呼び出している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("updateInquiryStatus");
    });

    it("result.pendingApproval のハンドリングコードが含まれる", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("pendingApproval");
    });

    it("承認待ちの場合に「承認」を含むメッセージを返す", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("承認リクエストを作成しました");
    });

    it("converted ステータスへの変更時に convert 権限をチェックしている", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain('"inquiry", "convert"');
    });
  });

  describe("updateInquiryStatus usecase の pendingApproval 結果構造", () => {
    it("usecase が pendingApproval を返す型定義を持つ", async () => {
      const content = await readSrc("application/usecases/updateInquiryStatus.ts");
      expect(content).toContain("pendingApproval");
    });
  });

  describe("TC-053: update_status → declined の usecase 呼び出し", () => {
    it("inquiries.ts が declined ステータスを updateInquiryStatus に渡している", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain('"declined"');
      expect(content).toContain("updateInquiryStatus");
    });

    it("declined ステータス変更時に decline 権限をチェックしている", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain('"inquiry", "decline"');
    });
  });
});

// ---------------------------------------------------------------------------
// TC-011/TC-012: 承認フロー pending 分岐 runtime テスト
//
// inquiries ツールの update_status → converted 操作が：
// TC-011: 承認ポリシー該当時（usecase が pendingApproval を返す）→ pending メッセージ付きレスポンス
// TC-012: 承認ポリシー非該当時（usecase が pendingApproval なし）→ 引合データのみ返す
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

const adminAuthInfo: AuthInfo = {
  token: "cfp_admin_test",
  clientId: "user-admin-1",
  scopes: [],
  extra: {
    userId: "user-admin-1",
    organizationId: "org-1",
    role: "admin",
  },
};

const updateStatusBody = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "inquiries",
    arguments: {
      operation: "update_status",
      inquiryId: INQUIRY_UUID,
      newStatus: "converted",
    },
  },
};

describe("TC-011 / TC-012: 承認フロー pending 分岐 runtime テスト", () => {
  beforeEach(() => {
    approvalMockState.updateInquiryStatusCalls = [];
  });

  it("TC-011: usecase が pendingApproval を返す場合、ツール結果に承認待ちメッセージが含まれる", async () => {
    approvalMockState.mode = "pending";

    const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
    registerInquiriesTools(server);

    const response = await dispatchMcpRequest(server, updateStatusBody, adminAuthInfo);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result?: { content?: Array<{ text: string }> };
    };
    const text = body.result?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as {
      pendingApproval?: { requestId: string };
      message?: string;
    };

    // pendingApproval と承認待ちメッセージが含まれること
    expect(parsed.pendingApproval?.requestId).toBe("req-pending-1");
    expect(parsed.message).toContain("承認リクエストを作成しました");
  });

  it("TC-012: usecase が deal を即時返す（direct変換）場合、ツール結果に inquiry と deal が含まれる", async () => {
    approvalMockState.mode = "direct";

    const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
    registerInquiriesTools(server);

    const response = await dispatchMcpRequest(server, updateStatusBody, adminAuthInfo);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result?: { content?: Array<{ text: string }> };
    };
    const text = body.result?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as {
      inquiry?: { id: string };
      deal?: { id: string };
      pendingApproval?: unknown;
    };

    // 即時案件化: inquiry と deal が含まれ、pendingApproval は含まれないこと
    expect(parsed.inquiry?.id).toBe(INQUIRY_UUID);
    expect(parsed.deal?.id).toBe(DEAL_UUID);
    expect(parsed.pendingApproval).toBeUndefined();
  });

  it("TC-011/TC-012 共通: updateInquiryStatus が organizationId を受け取ること", async () => {
    approvalMockState.mode = "direct";

    const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
    registerInquiriesTools(server);

    await dispatchMcpRequest(server, updateStatusBody, adminAuthInfo);

    expect(approvalMockState.updateInquiryStatusCalls).toHaveLength(1);
    expect(approvalMockState.updateInquiryStatusCalls[0]!.organizationId).toBe("org-1");
    expect(approvalMockState.updateInquiryStatusCalls[0]!.newStatus).toBe("converted");
  });
});
