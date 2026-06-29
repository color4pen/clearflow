import { describe, it, expect } from "bun:test";
import { getActionLabel } from "@/lib/activityLabels";

describe("getActionLabel", () => {
  it('deal.create が "案件を作成" を返す', () => {
    expect(getActionLabel({ action: "deal.create" })).toBe("案件を作成");
  });

  it('未知 action はそのまま返す（フォールバック）', () => {
    expect(getActionLabel({ action: "unknown.action" })).toBe("unknown.action");
  });

  // タイムライン対象のアクションすべてにラベルが定義されていることを確認する
  it('interaction.create が "商談を記録" を返す', () => {
    expect(getActionLabel({ action: "interaction.create" })).toBe("商談を記録");
  });

  it('meeting.create が "商談を記録" を返す（後方互換）', () => {
    expect(getActionLabel({ action: "meeting.create" })).toBe("商談を記録");
  });

  it('deal.updatePhase が "フェーズを変更" を返す（transition なし）', () => {
    expect(getActionLabel({ action: "deal.updatePhase" })).toBe("フェーズを変更");
  });

  it('contract.create が "契約を作成" を返す', () => {
    expect(getActionLabel({ action: "contract.create" })).toBe("契約を作成");
  });

  it('contract.updateStatus が "契約ステータスを変更" を返す（transition なし）', () => {
    expect(getActionLabel({ action: "contract.updateStatus" })).toBe("契約ステータスを変更");
  });

  it('invoice.create が "請求を作成" を返す', () => {
    expect(getActionLabel({ action: "invoice.create" })).toBe("請求を作成");
  });

  it('invoice.update_status が "請求ステータスを変更" を返す（transition なし）', () => {
    expect(getActionLabel({ action: "invoice.update_status" })).toBe("請求ステータスを変更");
  });

  // 状態遷移の表示テスト
  it('deal.updatePhase + transition あり で "フェーズを変更：提案準備 → 交渉中" を返す', () => {
    expect(
      getActionLabel({
        action: "deal.updatePhase",
        transition: { from: "proposal_prep", to: "negotiation" },
      })
    ).toBe("フェーズを変更：提案準備 → 交渉中");
  });

  it('contract.updateStatus + transition あり で "契約ステータスを変更：契約中 → 完了" を返す', () => {
    expect(
      getActionLabel({
        action: "contract.updateStatus",
        transition: { from: "active", to: "completed" },
      })
    ).toBe("契約ステータスを変更：契約中 → 完了");
  });

  it('invoice.update_status + transition あり で "請求ステータスを変更：予定 → 請求済" を返す', () => {
    expect(
      getActionLabel({
        action: "invoice.update_status",
        transition: { from: "scheduled", to: "invoiced" },
      })
    ).toBe("請求ステータスを変更：予定 → 請求済");
  });

  it("transition が null の場合は基本ラベルのみ返す", () => {
    expect(
      getActionLabel({ action: "deal.updatePhase", transition: null })
    ).toBe("フェーズを変更");
  });

  it("transition が undefined の場合は基本ラベルのみ返す", () => {
    expect(
      getActionLabel({ action: "deal.updatePhase" })
    ).toBe("フェーズを変更");
  });

  // タイムライン対象 8 アクションに生キーが漏れないことを確認する
  it("タイムライン対象の 8 アクションすべてに日本語ラベルが定義されている（生キーにフォールバックしない）", () => {
    const timelineActions = [
      "interaction.create",
      "meeting.create",
      "deal.create",
      "deal.updatePhase",
      "contract.create",
      "contract.updateStatus",
      "invoice.create",
      "invoice.update_status",
    ];
    for (const action of timelineActions) {
      const label = getActionLabel({ action });
      // 日本語ラベルが返される（生キーではない）ことを確認
      expect(label).not.toBe(action);
      expect(label).not.toBe("");
    }
  });
});
