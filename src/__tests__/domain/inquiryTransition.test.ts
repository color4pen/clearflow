import { describe, it, expect } from "bun:test";
import { canTransition } from "@/domain/services/inquiryTransition";

describe("canTransition — 引き合いステータス遷移ルール", () => {
  // 許可される遷移
  it("T-01: new → converted が許可される（直接案件化）", () => {
    // 準備 - なし（純粋関数）
    // 実行 - canTransition を呼び出す
    const result = canTransition("new", "converted");
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

  it("T-03: declined → new が許可される（対応再開）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("declined", "new");
    // 検証 - true が返る
    expect(result).toBe(true);
  });

  it("T-04: new → in_progress が拒否される（廃止）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    // @ts-expect-error in_progress は型上も廃止済み
    const result = canTransition("new", "in_progress");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  // 拒否される遷移（終端状態からの遷移）
  it("T-05: converted → new が拒否される（終端状態）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("converted", "new");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-06: declined → in_progress が拒否される（廃止）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    // @ts-expect-error in_progress は型上も廃止済み
    const result = canTransition("declined", "in_progress");
    // 検証 - false が返る
    expect(result).toBe(false);
  });

  it("T-07: declined → new が許可される（再開）", () => {
    // 準備 - なし
    // 実行 - canTransition を呼び出す
    const result = canTransition("declined", "new");
    // 検証 - true が返る
    expect(result).toBe(true);
  });
});
