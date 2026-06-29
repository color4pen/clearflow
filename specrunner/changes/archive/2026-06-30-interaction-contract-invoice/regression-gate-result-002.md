# Regression Gate Result — Iteration 002

- **date**: 2026-06-30
- **verdict**: approved

## Summary

Ledger の 3 件の finding をすべて確認した。いずれも修正済みであり、リグレッションは検出されなかった。

## Finding Verification

### [MEDIUM] `details` フィールドが usecase で無視される
- **File**: src/application/usecases/createContractAdjustment.ts:35 / createInvoiceAdjustment.ts:35
- **Status**: ✅ Fixed
- **Evidence**: `createContractAdjustment.ts` L35–37・`createInvoiceAdjustment.ts` L35–37 で `data.details != null` のガードを設け、`{ notes: data.details, ... }` として `interactionRepository.create` に渡している。`details: null` の固定値渡しは解消済み。

### [LOW] TC-020・TC-021・TC-023 に対応する Server Action 動的テストが欠落
- **File**: src/__tests__/actions/interactions.dynamic.test.ts
- **Status**: ✅ Fixed
- **Evidence**: ファイルが新規追加されており、以下のテスト群が実装されている。
  - TC-020（未認証）: `recordContractAdjustmentAction` / `recordInvoiceAdjustmentAction` ともにセッションなし時に `"認証が必要です"` を返し、usecase が呼ばれないことをアサート（L214–248）。
  - TC-021（認可不足）: `finance` ロールで contract action・`member` ロールで invoice action がそれぞれ `"この操作を実行する権限がありません"` を返し、usecase が呼ばれないことをアサート（L254–292）。
  - TC-023（成功）: 正常入力で usecase が呼ばれ `revalidatePath` が実行され空オブジェクトが返ることをアサート（L298–355）。

### [LOW] `targetInfoMap` 構築時に `i.contractId` / `i.invoiceId` を null チェックなしで href に補間
- **File**: src/application/usecases/getDealActivity.ts:116
- **Status**: ✅ Fixed
- **Evidence**: L119 で `i.contractId ? \`/contracts/${i.contractId}\` : \`/contracts\`` のガードを使用。L132–133 では `relatedInvoice && i.invoiceId` で二重チェックしてから href を構築しており、型安全性が確保されている。

## Regressions

なし。

## Contradictions

なし。
