/**
 * T-07: プロトコルレベル統合テスト
 * TC-001, TC-025, TC-026, TC-027, TC-028
 *
 * MCP 実装ファイルの静的検証：
 * - route.ts の McpServer 設定
 * - ツール登録数
 * - 基本的な構造の確認
 */

import { describe, it, expect } from "bun:test";
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
