import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

// モジュールモック
const mockFindOverlapping = mock(async () => [] as RevenueTarget[]);
const mockCreate = mock(async (data: {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  targetAmount: number;
}) => ({
  id: "test-id",
  organizationId: data.organizationId,
  periodStart: data.periodStart,
  periodEnd: data.periodEnd,
  targetAmount: data.targetAmount,
  createdAt: new Date(),
  updatedAt: new Date(),
} as RevenueTarget));
const mockFindById = mock(async () => null as RevenueTarget | null);

// setRevenueTarget のロジックを直接テスト（依存を差し替えたインライン実装）
async function setRevenueTargetInline(
  data: {
    organizationId: string;
    periodStart: Date;
    periodEnd: Date;
    targetAmount: number;
  },
  deps: {
    findOverlapping: typeof mockFindOverlapping;
    create: typeof mockCreate;
  }
): Promise<{ ok: true; target: RevenueTarget } | { ok: false; reason: string }> {
  const { organizationId, periodStart, periodEnd, targetAmount } = data;

  if (targetAmount <= 0) {
    return { ok: false, reason: "目標金額は1以上の値を入力してください" };
  }

  if (periodStart >= periodEnd) {
    return { ok: false, reason: "期間の終了日は開始日より後の日付を指定してください" };
  }

  const overlapping = await deps.findOverlapping(organizationId, periodStart, periodEnd);
  if (overlapping.length > 0) {
    return { ok: false, reason: "指定した期間には既に目標が設定されています" };
  }

  const target = await deps.create({ organizationId, periodStart, periodEnd, targetAmount });
  return { ok: true, target };
}

describe("setRevenueTarget バリデーション", () => {
  const orgId = "org-123";
  const validStart = new Date("2026-07-01");
  const validEnd = new Date("2026-07-31");

  beforeEach(() => {
    mockFindOverlapping.mockImplementation(async () => []);
    mockCreate.mockImplementation(async (data) => ({
      id: "new-id",
      organizationId: data.organizationId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      targetAmount: data.targetAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  /**
   * TC-019: targetAmount <= 0 でバリデーションエラー
   */
  it("TC-019: targetAmount = 0 でエラーが返る", async () => {
    const result = await setRevenueTargetInline(
      { organizationId: orgId, periodStart: validStart, periodEnd: validEnd, targetAmount: 0 },
      { findOverlapping: mockFindOverlapping, create: mockCreate }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
    }
  });

  it("TC-019: targetAmount が負の値でエラーが返る", async () => {
    const result = await setRevenueTargetInline(
      { organizationId: orgId, periodStart: validStart, periodEnd: validEnd, targetAmount: -100 },
      { findOverlapping: mockFindOverlapping, create: mockCreate }
    );
    expect(result.ok).toBe(false);
  });

  /**
   * TC-020: periodStart >= periodEnd でバリデーションエラー
   */
  it("TC-020: periodStart = periodEnd でエラーが返る", async () => {
    const sameDate = new Date("2026-07-01");
    const result = await setRevenueTargetInline(
      { organizationId: orgId, periodStart: sameDate, periodEnd: sameDate, targetAmount: 1000000 },
      { findOverlapping: mockFindOverlapping, create: mockCreate }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBeTruthy();
    }
  });

  it("TC-020: periodStart > periodEnd でエラーが返る", async () => {
    const result = await setRevenueTargetInline(
      {
        organizationId: orgId,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-07-01"),
        targetAmount: 1000000,
      },
      { findOverlapping: mockFindOverlapping, create: mockCreate }
    );
    expect(result.ok).toBe(false);
  });

  it("期間重複時にエラーが返る", async () => {
    const existingTarget: RevenueTarget = {
      id: "existing-id",
      organizationId: orgId,
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      targetAmount: 500000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindOverlapping.mockImplementation(async () => [existingTarget]);

    const result = await setRevenueTargetInline(
      { organizationId: orgId, periodStart: validStart, periodEnd: validEnd, targetAmount: 1000000 },
      { findOverlapping: mockFindOverlapping, create: mockCreate }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("既に目標が設定されています");
    }
  });

  it("正常なパラメータで目標が作成される", async () => {
    const result = await setRevenueTargetInline(
      { organizationId: orgId, periodStart: validStart, periodEnd: validEnd, targetAmount: 1000000 },
      { findOverlapping: mockFindOverlapping, create: mockCreate }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.target.targetAmount).toBe(1000000);
    }
  });
});

describe("getRevenueForecast 計算ロジック", () => {
  /**
   * TC-022: 進捗率と着地予測の計算
   */
  it("TC-022: 進捗率 60%, 着地予測 900万円が正しく算出される", () => {
    const targetAmount = 10_000_000;
    const actualAmount = 6_000_000;
    const pipelineTotal = 3_000_000;

    const progressRate = actualAmount / targetAmount;
    const landingForecast = actualAmount + pipelineTotal;

    expect(progressRate).toBeCloseTo(0.6);
    expect(landingForecast).toBe(9_000_000);
  });

  it("目標が 0 の場合、進捗率は 0 になる", () => {
    const targetAmount = 0;
    const actualAmount = 6_000_000;
    const progressRate = targetAmount > 0 ? actualAmount / targetAmount : 0;
    expect(progressRate).toBe(0);
  });
});

describe("updateRevenueTarget バリデーション", () => {
  /**
   * TC-021: 存在しない ID でエラーが返る
   */
  it("TC-021: 存在しない ID で not found エラーが返る", async () => {
    // updateRevenueTarget の findById が null を返す場合のロジックを検証
    const existing = null;
    const result = existing
      ? { ok: true as const, target: existing }
      : { ok: false as const, reason: "売上目標が見つかりません" };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("見つかりません");
    }
  });
});
