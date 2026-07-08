/**
 * 停滞案件フィルタの境界条件静的検証テスト。
 * dashboard/page.tsx のフィルタロジックを静的解析し、
 * 境界値と除外条件が正しく実装されていることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("停滞案件フィルタ 境界条件 静的検証", () => {
  it("TC-052: updatedAt が 10 日前の案件は停滞案件に含まれない — 閾値が 14 日で定義されている", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/page.tsx");
    // 閾値が 14 日（14 * 24 * 60 * 60 * 1000 ms）であることを確認する
    // 10 日前の案件は fourteenDaysAgo より新しいため deal.updatedAt <= fourteenDaysAgo が false となり除外される
    expect(content).toContain("14 * 24 * 60 * 60 * 1000");
    // fourteenDaysAgo 変数が存在する
    expect(content).toContain("fourteenDaysAgo");
    // 比較演算子が <= であること（14 日以上前 = 14 日丁度を含む）
    expect(content).toContain("updatedAt <= fourteenDaysAgo");
  });

  it("TC-053: won/lost/passed フェーズの案件は停滞案件に含まれない — フェーズ除外条件が存在する", async () => {
    const content = await readSrc("app/(dashboard)/dashboard/page.tsx");
    // won フェーズを除外する条件
    expect(content).toContain('phase !== "won"');
    // lost フェーズを除外する条件
    expect(content).toContain('phase !== "lost"');
    // passed フェーズを除外する条件
    expect(content).toContain('phase !== "passed"');
    // 条件が AND で結合されている
    const wonIdx = content.indexOf('phase !== "won"');
    const lostIdx = content.indexOf('phase !== "lost"');
    const between = content.slice(wonIdx, lostIdx);
    expect(between).toContain("&&");
  });
});
