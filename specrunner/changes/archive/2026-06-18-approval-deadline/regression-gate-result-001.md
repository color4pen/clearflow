# Regression Gate Result — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Summary

4件の修正を検証した結果、2件は正しく修正済み、2件は未修正（リグレッション）。

## Findings

### ✅ FIXED — Finding 1 (MEDIUM): usecase統合テストのランタイム検証化

`src/__tests__/usecases/approvalDeadline.test.ts` は `mock.module()` を使って repository・db・next/server を差し替えた軽量スタブ構成に全面的に書き換えられており、TC-008/012/013/015/016/020-023/025 はすべて実際の usecase 関数を呼び出してその戻り値を検証している。静的ソース解析テストは残存していない。**修正確認済み。**

### ❌ REGRESSION — Finding 2 (LOW→HIGH): テスト名が期待値と矛盾

- **File**: `src/__tests__/domain/approvalStepService.test.ts:204`
- **現状**: テスト名 `"returns true when deadline equals now (boundary: not strictly future)"` のまま変更なし
- **期待値**: `expect(isStepExpired(step, now)).toBe(false)` — 名前と真逆
- **指定された修正**: `"returns false when deadline equals now (strict less-than boundary)"` へのリネーム
- **状態**: 未修正

### ✅ FIXED — Finding 3 (LOW): TC-013の静的解析による位置検証の問題

`rejectRequest` の `targetStatus: "rejected"` パスのテストは、`src.indexOf()` による文字列位置解析を完全に廃止し、`rejectRequest({ targetStatus: "rejected" })` を直接呼び出してランタイムで `result.ok === false` / `result.reason` を検証するテストに置き換えられている。**修正確認済み。**

### ❌ REGRESSION — Finding 4 (LOW→HIGH): findOverdueRequestIds が new Date() を使用

- **File**: `src/infrastructure/repositories/approvalStepRepository.ts:140-151`
- **現状**:
  ```ts
  const now = new Date();
  ...
  lt(approvalSteps.deadline, now),
  ```
- **指定された修正**: `lt(approvalSteps.deadline, sql\`NOW()\`)` に変更して DB サーバ時刻を基準にする
- **状態**: 未修正。`new Date()` はアプリサーバ時刻を使用するため、サーバ間時刻ズレの影響を受ける

## Verdict

2件のリグレッション（Finding 2, Finding 4）が未修正。`needs-fix`。
