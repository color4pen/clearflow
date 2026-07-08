import { describe, it, expect } from "bun:test";
import { canTransition } from "@/domain/services/dealTransition";
import type { DealPhase } from "@/domain/models/deal";

describe("canTransition — 案件フェーズ遷移ルール", () => {
  // hearing フェーズへの遷移
  it("T-00a: hearing → proposal_prep が許可される", () => {
    const result = canTransition("hearing", "proposal_prep");
    expect(result).toBe(true);
  });

  it("T-00b: hearing → passed が許可される（見送りは hearing から直接遷移可）", () => {
    const result = canTransition("hearing", "passed");
    expect(result).toBe(true);
  });

  it("T-00c: hearing → won が許可される（スキップ可）", () => {
    const result = canTransition("hearing", "won");
    expect(result).toBe(true);
  });

  it("T-00d: hearing → lost が許可される", () => {
    const result = canTransition("hearing", "lost");
    expect(result).toBe(true);
  });

  it("T-00e: hearing → hearing が拒否される（同一フェーズ遷移）", () => {
    const result = canTransition("hearing", "hearing");
    expect(result).toBe(false);
  });

  // passed フェーズは終端
  it("T-00f: passed → hearing が拒否される（終端状態）", () => {
    const result = canTransition("passed", "hearing");
    expect(result).toBe(false);
  });

  it("T-00g: passed → proposal_prep が拒否される（終端状態）", () => {
    const result = canTransition("passed", "proposal_prep");
    expect(result).toBe(false);
  });

  it("T-00h: passed → won が拒否される（終端状態）", () => {
    const result = canTransition("passed", "won");
    expect(result).toBe(false);
  });

  it("T-00i: passed → lost が拒否される（終端状態）", () => {
    const result = canTransition("passed", "lost");
    expect(result).toBe(false);
  });

  it("T-00j: 全非終端フェーズから passed への遷移が許可される", () => {
    expect(canTransition("hearing", "passed")).toBe(true);
    expect(canTransition("proposal_prep", "passed")).toBe(true);
    expect(canTransition("proposed", "passed")).toBe(true);
    expect(canTransition("negotiation", "passed")).toBe(true);
  });

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

  it("T-05: negotiation → won が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("negotiation", "won");
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

  it("T-07: negotiation → estimate_approval が拒否される（フェーズ削除）", () => {
    // 準備 - estimate_approval は DealPhase から削除されたため型アサーションを使用
    // 実行 - canTransition を呼び出す
    const result = canTransition("negotiation", "estimate_approval" as DealPhase);
    // 検証 - false が返る（ALL_PHASES に含まれない廃止フェーズへの遷移は拒否）
    expect(result).toBe(false);
  });

  it("T-08: estimate_approval → won が拒否される（フェーズ削除）", () => {
    // 準備 - estimate_approval は DealPhase から削除されたため型アサーションを使用
    // 実行 - canTransition を呼び出す
    const result = canTransition("estimate_approval" as DealPhase, "won");
    // 検証 - false が返る（ALL_PHASES に含まれない廃止フェーズからの遷移は拒否）
    expect(result).toBe(false);
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

  it("T-13: proposal_prep → negotiation が許可される（スキップ可）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposal_prep", "negotiation");
    // 検証 - true が返る（終端チェックのみ。スキップ・巻き戻しは全て許可）
    expect(result).toBe(true);
  });

  it("T-15: 全フェーズ（proposal_prep, proposed, negotiation）から lost への遷移が許可される", () => {
    // 準備 - なし
    // 実行・検証 - 各フェーズから lost への遷移が可能
    expect(canTransition("proposal_prep", "lost")).toBe(true);
    expect(canTransition("proposed", "lost")).toBe(true);
    expect(canTransition("negotiation", "lost")).toBe(true);
  });

  it("T-16: proposed → proposal_prep が許可される（巻き戻し可）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("proposed", "proposal_prep");
    // 検証 - true が返る（終端チェックのみ。巻き戻しも許可）
    expect(result).toBe(true);
  });

  it("T-17: 同一フェーズへの遷移が拒否される", () => {
    // 準備 - なし
    // 実行・検証 - 各フェーズから同一フェーズへの遷移が拒否される
    expect(canTransition("proposal_prep", "proposal_prep")).toBe(false);
    expect(canTransition("proposed", "proposed")).toBe(false);
    expect(canTransition("negotiation", "negotiation")).toBe(false);
  });
});
