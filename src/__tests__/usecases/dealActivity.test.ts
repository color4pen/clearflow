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
  it("interactionRepository.findAllByDeal の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("interactionRepository.findAllByDeal");
  });

  it("contractRepository.findAllByDealId の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("contractRepository.findAllByDealId");
  });

  it("invoiceRepository.findAllByContract の呼び出しが含まれる（請求は契約経由で解決）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("invoiceRepository.findAllByContract");
  });

  it("actionItemRepository.findByDeal の呼び出しが含まれない（取得対象から除外）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).not.toContain("actionItemRepository");
  });

  it("dealContactRepository.findByDeal の呼び出しが含まれない（取得対象から除外）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).not.toContain("dealContactRepository");
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
    expect(content).not.toContain("`deal_contact:");
    expect(content).not.toContain('"deal_contact:');
    expect(content).not.toContain("'deal_contact:");
  });

  it("TIMELINE_ACTIONS が includeActions として渡されている", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("TIMELINE_ACTIONS");
    expect(content).toContain("includeActions");
  });

  it("aggregateTimeline の呼び出しが含まれる（集約ロジック）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("aggregateTimeline");
  });

  it("findByTargets に limit が渡されていない（集約前に上限で切らない）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    // findByTargets の呼び出しに limit: が含まれていないことを確認
    // (ACTIVITY_TIMELINE_LIMIT は slice で適用される)
    const findByTargetsBlock = content.match(/findByTargets\([^;]+\)/s)?.[0] ?? "";
    expect(findByTargetsBlock).not.toContain("limit");
  });

  it("slice で ACTIVITY_TIMELINE_LIMIT を適用している（集約後に上限）", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("slice(0, ACTIVITY_TIMELINE_LIMIT)");
  });

  it("DealActivityResult の logs が TimelineEntry[] になっている", async () => {
    const content = await readSrc("application/usecases/getDealActivity.ts");
    expect(content).toContain("TimelineEntry");
  });
});
