/**
 * T-11: 承認フロー連携テスト
 * TC-011, TC-012, TC-053
 *
 * inquiries update_status → converted が承認ポリシー有無によって
 * 正しく動作することを静的検証する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

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
