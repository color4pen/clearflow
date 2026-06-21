import { describe, it, expect } from "bun:test";
import { canTransition } from "@/domain/services/dealTransition";

describe("canTransition — 案件フェーズ遷移ルール", () => {
  // 許可される遷移
  it("T-01: proposal_prep → proposed が許可される", () => {
    // 準備 - なし（純粋関数）
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposal_prep", "proposed");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-02: proposal_prep → lost が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposal_prep", "lost");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-03: proposed → negotiation が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposed", "negotiation");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-04: proposed → lost が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposed", "lost");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-05: negotiation → estimate_approval が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("negotiation", "estimate_approval");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-06: negotiation → lost が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("negotiation", "lost");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-07: estimate_approval → won が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("estimate_approval", "won");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-08: estimate_approval → lost が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("estimate_approval", "lost");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  // 拒否される遷移（終端状態からの遷移）
  it("T-09: won → proposal_prep が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("won", "proposal_prep");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-10: won → lost が拒否される（won は終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("won", "lost");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-11: lost → negotiation が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("lost", "negotiation");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-12: lost → proposal_prep が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("lost", "proposal_prep");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-13: proposal_prep → negotiation が拒否される（飛び越し禁止）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposal_prep", "negotiation");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-14: proposal_prep → estimate_approval が拒否される（飛び越し禁止）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposal_prep", "estimate_approval");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-15: 全フェーズ（proposal_prep, proposed, negotiation, estimate_approval）から lost への遷移が許可される", () => {
    // 準備 - なし
    // 実行・検証 - 各フェーズから lost への遷移が可能
    expect(canTransition("proposal_prep", "lost")).toBe(true);
    expect(canTransition("proposed", "lost")).toBe(true);
    expect(canTransition("negotiation", "lost")).toBe(true);
    expect(canTransition("estimate_approval", "lost")).toBe(true);
  });
});
