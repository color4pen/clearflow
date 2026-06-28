/**
 * getDealActivity usecase の静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("getDealActivity usecase 静的検証", () => {
  it("meetingRepository.findAllByDeal の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("meetingRepository.findAllByDeal");
  });

  it("contractRepository.findAllByDealId の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("contractRepository.findAllByDealId");
  });

  it("invoiceRepository.findAllByContract の呼び出しが含まれる（請求は契約経由で解決）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("invoiceRepository.findAllByContract");
  });

  it("actionItemRepository.findByDeal の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("actionItemRepository.findByDeal");
  });

  it("dealContactRepository.findByDeal の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("dealContactRepository.findByDeal");
  });

  it("auditLogRepository.findByTargets の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("auditLogRepository.findByTargets");
  });

  it("ACTIVITY_TIMELINE_LIMIT の参照が含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("ACTIVITY_TIMELINE_LIMIT");
  });

  it("getHiddenActions の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("getHiddenActions");
  });

  it("Promise.all が含まれる（並列取得）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("Promise.all");
  });

  // T-05: 新規テスト — targetInfoMap / TargetInfo / dealTitle の検証

  it("targetInfoMap の文字列が含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("targetInfoMap");
  });

  it("TargetInfo 型の定義が含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("TargetInfo");
  });

  it("dealTitle パラメータが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("dealTitle");
  });

  it("meetingTypeLabels の参照が含まれる（meeting ラベル構築に使用）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("meetingTypeLabels");
  });

  it('"/deals/" のパスパターンが含まれる（deal / meeting の href 構築）', async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("/deals/");
  });

  it('"/contracts/" のパスパターンが含まれる（contract の href 構築）', async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("/contracts/");
  });

  it("deal_contact が targetInfoMap のキーとして設定されていない", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    // deal_contact は targets 配列には含まれるが、targetInfoMap のキーとして設定する記述が無いことを確認
    // `deal_contact:` というマップキー構築パターンが存在しないことを検証
    expect(content).not.toContain("`deal_contact:");
    expect(content).not.toContain('"deal_contact:');
    expect(content).not.toContain("'deal_contact:");
  });
});
