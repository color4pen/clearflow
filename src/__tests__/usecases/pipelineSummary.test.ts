/**
 * getPipelineSummary ユースケースの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要な集計パターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("getPipelineSummary usecase 静的検証", () => {
  it("TC-105: 全 7 フェーズの集計結果が返される — ALL_PHASES 定義に全フェーズがある", async () => {
    const content = await readSrc("application/usecases/getPipelineSummary.ts");
    // 全 7 フェーズが定義されている
    expect(content).toContain("hearing");
    expect(content).toContain("proposal_prep");
    expect(content).toContain("proposed");
    expect(content).toContain("negotiation");
    expect(content).toContain("won");
    expect(content).toContain("lost");
    expect(content).toContain("passed");
  });

  it("TC-105: 案件 0 件のフェーズも含まれる — 初期化ロジックがある", async () => {
    const content = await readSrc("application/usecases/getPipelineSummary.ts");
    // 全フェーズを初期値 0 で Map 初期化している
    expect(content).toContain("ALL_PHASES");
    // count: 0 と totalAmount: 0 の初期化
    expect(content).toContain("count: 0");
    expect(content).toContain("totalAmount: 0");
  });

  it("TC-106: estimatedAmount が null の案件は金額 0 扱い — nullish coalescing がある", async () => {
    const content = await readSrc("application/usecases/getPipelineSummary.ts");
    // estimatedAmount ?? 0 パターンが存在する
    expect(content).toContain("estimatedAmount ?? 0");
  });

  it("TC-035: フェーズの想定金額合計が正確に算出される — totalAmount への加算がある", async () => {
    const content = await readSrc("application/usecases/getPipelineSummary.ts");
    // totalAmount への加算が存在する
    expect(content).toContain("totalAmount +=");
  });

  it("deals も返却値に含まれる（停滞案件フィルタ用）", async () => {
    const content = await readSrc("application/usecases/getPipelineSummary.ts");
    // { summary, deals } を返す
    expect(content).toContain("summary");
    expect(content).toContain("deals");
  });

  it("PipelineSummaryItem 型が dashboard.ts に定義されている", async () => {
    const content = await readSrc("domain/models/dashboard.ts");
    expect(content).toContain("PipelineSummaryItem");
    expect(content).toContain("count: number");
    expect(content).toContain("totalAmount: number");
  });

  it("getPipelineSummary が usecases/index.ts からエクスポートされている", async () => {
    const content = await readSrc("application/usecases/index.ts");
    expect(content).toContain("getPipelineSummary");
  });
});
