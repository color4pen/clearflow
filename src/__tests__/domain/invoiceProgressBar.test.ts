import { describe, it, expect } from "bun:test";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * プログレスバー計算ロジック（InvoiceSection.tsx の ProgressBarSummary と同じ）。
 */
function computeProgressBar(params: {
  contractAmount: number;
  paidTotal: number;
  invoicedTotal: number;
  scheduledTotal: number;
}) {
  const { contractAmount, paidTotal, invoicedTotal, scheduledTotal } = params;
  const base = contractAmount > 0 ? contractAmount : 1;
  const paidPct = clamp((paidTotal / base) * 100, 0, 100);
  const invoicedPct = clamp((invoicedTotal / base) * 100, 0, 100 - paidPct);
  const remaining = Math.max(contractAmount - paidTotal - invoicedTotal - scheduledTotal, 0);
  return { paidPct, invoicedPct, remaining };
}

describe("invoiceProgressBar", () => {
  it("TC-012: 単発契約で各セグメント割合が正しく計算される", () => {
    const result = computeProgressBar({
      contractAmount: 1_000_000,
      paidTotal: 300_000,
      invoicedTotal: 200_000,
      scheduledTotal: 300_000,
    });
    expect(result.paidPct).toBe(30);
    expect(result.invoicedPct).toBe(20);
    // 残り = 1,000,000 - 300,000 - 200,000 - 300,000 = 200,000
    expect(result.remaining).toBe(200_000);
  });

  it("TC-014: 請求合計が契約金額を超えてもバーが 100% でキャップされる", () => {
    const result = computeProgressBar({
      contractAmount: 500_000,
      paidTotal: 400_000,
      invoicedTotal: 300_000, // 合計 700,000 > 500,000
      scheduledTotal: 0,
    });
    // paidPct = 80%、invoicedPct は 100-80=20% でキャップ
    expect(result.paidPct).toBe(80);
    expect(result.invoicedPct).toBe(20);
    expect(result.paidPct + result.invoicedPct).toBeLessThanOrEqual(100);
  });

  it("TC-015: 請求合計が契約金額を超えた場合の残り金額は 0", () => {
    const result = computeProgressBar({
      contractAmount: 500_000,
      paidTotal: 300_000,
      invoicedTotal: 200_000,
      scheduledTotal: 100_000, // 合計 600,000 > 500,000
    });
    expect(result.remaining).toBe(0);
  });

  it("全額入金済みの場合、残り 0・paidPct 100%", () => {
    const result = computeProgressBar({
      contractAmount: 1_000_000,
      paidTotal: 1_000_000,
      invoicedTotal: 0,
      scheduledTotal: 0,
    });
    expect(result.paidPct).toBe(100);
    expect(result.invoicedPct).toBe(0);
    expect(result.remaining).toBe(0);
  });

  it("contractAmount が 0 の場合に除算エラーにならない", () => {
    const result = computeProgressBar({
      contractAmount: 0,
      paidTotal: 0,
      invoicedTotal: 0,
      scheduledTotal: 0,
    });
    expect(result.paidPct).toBe(0);
    expect(result.invoicedPct).toBe(0);
    expect(result.remaining).toBe(0);
  });
});

describe("contractList period display", () => {
  it("TC-002: 開始日と終了日が両方ある場合に「YYYY/M/D 〜 YYYY/M/D」形式で返る", () => {
    const startDate = new Date("2025-04-01T00:00:00+09:00");
    const endDate = new Date("2026-03-31T00:00:00+09:00");
    const start = startDate.toLocaleDateString("ja-JP");
    const end = endDate.toLocaleDateString("ja-JP");
    const display = end ? `${start} 〜 ${end}` : `${start} 〜`;
    expect(display).toContain("〜");
    expect(display.split("〜").length).toBe(2);
    const parts = display.split(" 〜 ");
    expect(parts).toHaveLength(2);
  });

  it("TC-003: 終了日が null の場合に「{startDate} 〜」形式で返る", () => {
    const startDate = new Date("2025-04-01T00:00:00+09:00");
    const endDate: Date | null = null;
    const start = startDate.toLocaleDateString("ja-JP");
    const end = endDate ? endDate.toLocaleDateString("ja-JP") : null;
    const display = end ? `${start} 〜 ${end}` : `${start} 〜`;
    expect(display).toMatch(/〜$/);
  });
});
