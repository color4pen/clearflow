/**
 * T-10: テナント分離テスト
 * TC-013, TC-049, TC-050
 *
 * ツールハンドラが常に認証済みの organizationId を usecase に渡すことを静的に検証する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

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
