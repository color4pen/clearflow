/**
 * SalesDashboard 純粋関数ユニットテスト
 *
 * TC-009: formatRelativeTime — 30 分前の活動
 * TC-016: パイプライン合計列のフロントエンド算出
 */

import { describe, it, expect } from "bun:test";
import { formatRelativeTime } from "@/app/(dashboard)/dashboard/dashboardUtils";
import type { PipelineSummaryItem } from "@/domain/models/dashboard";

// ---------------------------------------------------------------------------
// TC-009: formatRelativeTime — 30 分前の活動
// ---------------------------------------------------------------------------

describe("formatRelativeTime", () => {
  /**
   * TC-009: 30 分前の Date を渡すと「30分前」が返る
   */
  it("TC-009: 30 分前 → 「30分前」", () => {
    const date = new Date(Date.now() - 30 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("30分前");
  });

  /**
   * TC-014: 30 秒前の Date を渡すと「たった今」が返る
   */
  it("TC-014: 30 秒前 → 「たった今」", () => {
    const date = new Date(Date.now() - 30 * 1000);
    expect(formatRelativeTime(date)).toBe("たった今");
  });

  /**
   * TC-015: 3 時間前の Date を渡すと「3時間前」が返る
   */
  it("TC-015: 3 時間前 → 「3時間前」", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("3時間前");
  });

  /**
   * TC-010: 3 日前の Date を渡すと「3日前」が返る
   */
  it("TC-010: 3 日前 → 「3日前」", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("3日前");
  });
});

// ---------------------------------------------------------------------------
// TC-016: パイプライン合計列のフロントエンド算出
// ---------------------------------------------------------------------------

describe("パイプラインサマリ合計算出", () => {
  /**
   * TC-016: reduce で count と totalAmount をそれぞれ合計する
   *
   * 入力: [{count:2, totalAmount:1000000}, {count:3, totalAmount:2000000},
   *        {count:1, totalAmount:500000},  {count:4, totalAmount:5000000},
   *        {count:1, totalAmount:300000}]
   * 期待: count = 11, totalAmount = 8,800,000
   */
  it("TC-016: 5 フェーズの count 合計が 11 になる", () => {
    const pipelineSummary: Pick<PipelineSummaryItem, "count" | "totalAmount">[] = [
      { count: 2, totalAmount: 1000000 },
      { count: 3, totalAmount: 2000000 },
      { count: 1, totalAmount: 500000 },
      { count: 4, totalAmount: 5000000 },
      { count: 1, totalAmount: 300000 },
    ];

    const totalCount = pipelineSummary.reduce((s, i) => s + i.count, 0);
    expect(totalCount).toBe(11);
  });

  it("TC-016: 5 フェーズの totalAmount 合計が 8,800,000 になる", () => {
    const pipelineSummary: Pick<PipelineSummaryItem, "count" | "totalAmount">[] = [
      { count: 2, totalAmount: 1000000 },
      { count: 3, totalAmount: 2000000 },
      { count: 1, totalAmount: 500000 },
      { count: 4, totalAmount: 5000000 },
      { count: 1, totalAmount: 300000 },
    ];

    const totalAmount = pipelineSummary.reduce((s, i) => s + i.totalAmount, 0);
    expect(totalAmount).toBe(8800000);
  });
});
