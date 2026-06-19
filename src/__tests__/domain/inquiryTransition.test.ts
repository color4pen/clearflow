import { describe, it, expect } from "bun:test";
import { canTransition } from "@/domain/services/inquiryTransition";

describe("canTransition — 引き合いステータス遷移ルール", () => {
  // 許可される遷移
  it("T-01: new → in_progress が許可される", () => {
    // 準備 - なし（純粋関数）
    // 実行 - canTransition を呼び出す
    const result = canTransition("new", "in_progress");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-02: new → declined が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("new", "declined");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-03: in_progress → converted が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("in_progress", "converted");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-04: in_progress → declined が許可される", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("in_progress", "declined");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  // 拒否される遷移（終端状態からの遷移）
  it("T-05: converted → new が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("converted", "new");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-06: converted → in_progress が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("converted", "in_progress");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-07: declined → in_progress が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("declined", "in_progress");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-08: declined → new が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("declined", "new");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-09: new → converted が拒否される（スキップ不可）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("new", "converted");
    // 検証 - new から直接 converted への遷移は不可
    expect(result).toBe(false);
  });
});
