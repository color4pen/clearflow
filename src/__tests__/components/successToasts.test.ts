/**
 * 成功トースト文言テスト
 *
 * 各フォームファイルが正しい成功トースト文言と showToast 呼び出しを
 * 含んでいることを静的解析で確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("成功トースト文言 — ClientForm", () => {
  it("ClientForm.tsx が showToast をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/clients/new/ClientForm.tsx");
    expect(content).toContain("useToast");
  });

  it("ClientForm.tsx に showToast の呼び出しが存在する", async () => {
    const content = await readSrc("app/(dashboard)/clients/new/ClientForm.tsx");
    expect(content).toContain("showToast");
  });

  it("ClientForm.tsx に「顧客を登録しました」が含まれる", async () => {
    const content = await readSrc("app/(dashboard)/clients/new/ClientForm.tsx");
    expect(content).toContain("顧客を登録しました");
  });
});

describe("成功トースト文言 — InquiryForm", () => {
  it("InquiryForm.tsx が showToast をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/new/InquiryForm.tsx");
    expect(content).toContain("useToast");
  });

  it("InquiryForm.tsx に showToast の呼び出しが存在する", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/new/InquiryForm.tsx");
    expect(content).toContain("showToast");
  });

  it("InquiryForm.tsx に「引き合いを登録しました」が含まれる", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/new/InquiryForm.tsx");
    expect(content).toContain("引き合いを登録しました");
  });
});

describe("成功トースト文言 — NewDealForm", () => {
  it("NewDealForm.tsx が showToast をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/deals/new/NewDealForm.tsx");
    expect(content).toContain("useToast");
  });

  it("NewDealForm.tsx に showToast の呼び出しが存在する", async () => {
    const content = await readSrc("app/(dashboard)/deals/new/NewDealForm.tsx");
    expect(content).toContain("showToast");
  });

  it("NewDealForm.tsx に「案件を作成しました」が含まれる", async () => {
    const content = await readSrc("app/(dashboard)/deals/new/NewDealForm.tsx");
    expect(content).toContain("案件を作成しました");
  });
});

describe("成功トースト文言 — NewContractForm", () => {
  it("NewContractForm.tsx が showToast をインポートしている", async () => {
    const content = await readSrc("app/(dashboard)/contracts/new/NewContractForm.tsx");
    expect(content).toContain("useToast");
  });

  it("NewContractForm.tsx に showToast の呼び出しが存在する", async () => {
    const content = await readSrc("app/(dashboard)/contracts/new/NewContractForm.tsx");
    expect(content).toContain("showToast");
  });

  it("NewContractForm.tsx に「契約を作成しました」が含まれる", async () => {
    const content = await readSrc("app/(dashboard)/contracts/new/NewContractForm.tsx");
    expect(content).toContain("契約を作成しました");
  });
});
