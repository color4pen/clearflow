# Regression Gate Result — Iteration 001

- **verdict**: approved

## Summary

Ledger の全 5 件（実質 3 件）の修正がコードに残存していることを確認した。リグレッションなし。

## Findings Verification

### [HIGH] TC-039: 却下フォームにコメントが渡らない
- **File**: `src/app/(dashboard)/requests/[id]/ActionButtons.tsx`
- **Status**: ✅ Fixed
- `useState("")` で `comment` を管理し、approve/reject 両フォーム内に `<input type="hidden" name="comment" value={comment} />` を配置する実装に変更されている。`new FormData(e.currentTarget)` で comment が収集される。

### [LOW] 未使用インポート `statusClass`（Finding #2 / #4）
- **File**: `src/app/(dashboard)/requests/[id]/page.tsx:20`
- **Status**: ✅ Fixed
- `import { statusLabel } from "../statusUtils"` のみとなっており、`statusClass` は除去されている。

### [LOW] `<col style={{ width: '1.9fr' }}>` 無効 CSS 値（Finding #3 / #5）
- **File**: `src/app/(dashboard)/requests/BulkApprovalPanel.tsx`
- **Status**: ✅ Fixed
- `<colgroup>` 内の列幅指定はすべて `className="w-6"` / `style={{ width: "90px" }}` / `style={{ width: "110px" }}` 等の有効な値のみ。`fr` 単位は使用されていない。

## New Findings

なし。

## Verdict

すべての修正が維持されており、新規の問題も検出されなかった。**approved**。
