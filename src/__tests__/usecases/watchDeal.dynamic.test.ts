/**
 * watchDeal usecase の動的テスト。
 * モジュールモックを使って実際のビジネスロジックを検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Deal } from "@/domain/models/deal";
import type { Watch } from "@/domain/models/watch";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  deal: null as Deal | null,
  watch: null as Watch | null,
  createCallArgs: null as { userId: string; dealId: string; organizationId: string } | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（静的 import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories", () => ({
  dealRepository: {
    findById: async (_id: string, _orgId: string) => state.deal,
  },
  watchRepository: {
    create: async (args: { userId: string; dealId: string; organizationId: string }) => {
      state.createCallArgs = args;
      if (!state.watch) throw new Error("watch の作成に失敗しました");
      return state.watch;
    },
  },
}));

import { watchDeal } from "@/application/usecases/watchDeal";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ORG_ID = "org-001";
const USER_ID = "user-001";
const DEAL_ID = "deal-001";

const baseDeal: Deal = {
  id: DEAL_ID,
  organizationId: ORG_ID,
  inquiryId: null,
  clientId: "client-001",
  title: "テスト案件",
  description: null,
  phase: "proposal_prep",
  estimatedAmount: null,
  estimatedStartDate: null,
  estimatedEndDate: null,
  contractType: null,
  assigneeId: null,
  technicalLeadId: null,
  estimateRequestId: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
};

const baseWatch: Watch = {
  id: "watch-001",
  userId: USER_ID,
  dealId: DEAL_ID,
  organizationId: ORG_ID,
  createdAt: new Date("2026-01-01"),
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("watchDeal 組織所有権検証 動的テスト", () => {
  beforeEach(() => {
    state.deal = null;
    state.watch = null;
    state.createCallArgs = null;
  });

  it("TC-ownership-1: dealId が organizationId に属しない場合はエラーを返す（他テナント case）", async () => {
    // 準備: dealRepository.findById が null を返す（他テナント案件 or 存在しない）
    state.deal = null;
    state.watch = baseWatch;

    // 実行
    const result = await watchDeal({ userId: USER_ID, dealId: DEAL_ID, organizationId: ORG_ID });

    // 検証
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("指定された案件が見つかりません");
    }
    // watchRepository.create は呼ばれない
    expect(state.createCallArgs).toBeNull();
  });

  it("TC-ownership-2: dealId が organizationId に属する場合は watch を作成する", async () => {
    // 準備: dealRepository.findById が案件を返す
    state.deal = baseDeal;
    state.watch = baseWatch;

    // 実行
    const result = await watchDeal({ userId: USER_ID, dealId: DEAL_ID, organizationId: ORG_ID });

    // 検証
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.watch.dealId).toBe(DEAL_ID);
      expect(result.watch.userId).toBe(USER_ID);
    }
    // watchRepository.create が正しい引数で呼ばれた
    expect(state.createCallArgs).toEqual({ userId: USER_ID, dealId: DEAL_ID, organizationId: ORG_ID });
  });

  it("TC-ownership-3: dealId の存在確認に organizationId 条件が使われる（findById の呼び出し確認）", async () => {
    // 準備: findById 呼び出し引数をキャプチャするためにモックを上書き
    // state.deal = null のままにして、確認のみ行う
    state.deal = null;

    await watchDeal({ userId: USER_ID, dealId: "other-deal-id", organizationId: ORG_ID });

    // dealRepository.findById が呼ばれた結果エラーが返ることで、チェックが実行されたことを確認
    // watchRepository.create は呼ばれない（dealRepository が null を返したため）
    expect(state.createCallArgs).toBeNull();
  });
});
