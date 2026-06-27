import { describe, it, expect } from "bun:test";
import { getActionLabel } from "@/lib/activityLabels";

describe("getActionLabel", () => {
  it('deal.create が "案件を作成" を返す', () => {
    expect(getActionLabel({ action: "deal.create", metadata: null })).toBe("案件を作成");
  });

  it('未知 action はそのまま返す（フォールバック）', () => {
    expect(getActionLabel({ action: "unknown.action", metadata: null })).toBe("unknown.action");
  });

  it('action_item.toggle + done:true で "アクションアイテムを完了" を返す', () => {
    expect(
      getActionLabel({ action: "action_item.toggle", metadata: { done: true } })
    ).toBe("アクションアイテムを完了");
  });

  it('action_item.toggle + done:false で "アクションアイテムの完了を取り消し" を返す', () => {
    expect(
      getActionLabel({ action: "action_item.toggle", metadata: { done: false } })
    ).toBe("アクションアイテムの完了を取り消し");
  });
});
