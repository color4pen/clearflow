/**
 * T-12: 監査ログ記録テスト
 * TC-014, TC-015, TC-016, TC-046, TC-047, TC-048
 *
 * MCP ツールが usecase 経由で監査ログを記録することを静的検証する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("MCP 経由の監査ログ記録（静的検証）", () => {
  describe("TC-014: MCP 経由の引合作成が監査ログに記録される", () => {
    it("inquiries.ts が createInquiry usecase を呼び出す", async () => {
      const content = await readSrc("app/api/mcp/tools/inquiries.ts");
      expect(content).toContain("createInquiry");
    });

    it("createInquiry usecase が inquiry.create アクションの監査ログを記録する", async () => {
      const content = await readSrc("application/usecases/createInquiry.ts");
      expect(content).toContain("inquiry.create");
      expect(content).toContain("recordAudit");
    });
  });

  describe("TC-015: MCP 経由の顧客更新が監査ログに記録される", () => {
    it("clients.ts が updateClient usecase を呼び出す", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain("updateClient");
    });

    it("updateClient usecase が client.update アクションの監査ログを記録する", async () => {
      const content = await readSrc("application/usecases/updateClient.ts");
      expect(content).toContain("client.update");
      expect(content).toContain("recordAudit");
    });
  });

  describe("TC-016: MCP 経由の顧客担当者更新が監査ログに記録される", () => {
    it("clients.ts が updateClientContact usecase を呼び出す", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain("updateClientContact");
    });

    it("updateClientContact usecase が client_contact.update アクションの監査ログを記録する", async () => {
      const content = await readSrc("application/usecases/updateClientContact.ts");
      expect(content).toContain("client_contact.update");
      expect(content).toContain("recordAudit");
    });
  });

  describe("TC-046: MCP 経由の deals update_phase が監査ログに記録される", () => {
    it("deals.ts が updateDealPhase usecase を呼び出す", async () => {
      const content = await readSrc("app/api/mcp/tools/deals.ts");
      expect(content).toContain("updateDealPhase");
    });

    it("updateDealPhase usecase が deal.updatePhase アクションの監査ログを記録する", async () => {
      const content = await readSrc("application/usecases/updateDealPhase.ts");
      expect(content).toContain("deal.updatePhase");
      expect(content).toContain("recordAudit");
    });
  });

  describe("TC-047: MCP 経由の clients add_contact が監査ログに記録される", () => {
    it("clients.ts が createClientContact usecase を呼び出す", async () => {
      const content = await readSrc("app/api/mcp/tools/clients.ts");
      expect(content).toContain("createClientContact");
    });

    it("createClientContact usecase が client_contact.create アクションの監査ログを記録する", async () => {
      const content = await readSrc("application/usecases/createClientContact.ts");
      expect(content).toContain("client_contact.create");
      expect(content).toContain("recordAudit");
    });
  });

  describe("TC-048: 既存 Server Action（updateClientAction）が同一ユースケースを通る", () => {
    it("clients.ts（actions）が updateClient usecase を import している", async () => {
      const content = await readSrc("app/actions/clients.ts");
      expect(content).toContain("updateClient");
      expect(content).toContain("@/application/usecases");
    });

    it("clients.ts（actions）の updateClientAction が clientRepository.update を直接呼ばない", async () => {
      const content = await readSrc("app/actions/clients.ts");
      // updateClientAction の関数内で clientRepository.update の直接呼び出しが消えていることを確認
      // updateClient usecase 経由に変更されているため
      const updateClientActionMatch = content.match(
        /export async function updateClientAction[\s\S]*?^}/m
      );
      if (updateClientActionMatch) {
        expect(updateClientActionMatch[0]).not.toContain("clientRepository.update(");
      }
    });

    it("clients.ts（actions）の updateClientContactAction が clientRepository.updateContact を直接呼ばない", async () => {
      const content = await readSrc("app/actions/clients.ts");
      const updateContactActionMatch = content.match(
        /export async function updateClientContactAction[\s\S]*?^}/m
      );
      if (updateContactActionMatch) {
        expect(updateContactActionMatch[0]).not.toContain("clientRepository.updateContact(");
      }
    });
  });
});
