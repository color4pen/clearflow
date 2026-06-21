# Regression Gate Result — Iteration 002

- **date**: 2026-06-21
- **verdict**: approved

## Verification Summary

All 5 findings from the ledger are confirmed fixed.

### [HIGH] invoiceTransition.test.ts が未作成

- **status**: fixed
- **evidence**: `src/__tests__/domain/invoiceTransition.test.ts` が存在し、TC-001〜TC-006 の6件のテストが実装されている。`validateInvoiceTransition` を直接呼び出す純粋関数テストで、DB・モック不要のパターン。

### [LOW] updateInvoiceStatusAction の revalidatePath がリスト画面のみを再検証 (findings #2 / #3)

- **status**: fixed
- **evidence**: `src/app/actions/invoices.ts:84` で `contractId: string` が引数として追加され、line 112 で `revalidatePath('/contracts/${contractId}')` を呼び出している。契約詳細ページのサーバーキャッシュも再検証される。

### [MEDIUM] one_time 契約の金額上限チェックが並行 INSERT に対して安全でない（phantom read）

- **status**: fixed
- **evidence**: `src/application/usecases/createInvoice.ts:70` で `db.transaction(async (tx) => { ... }, { isolationLevel: 'serializable' })` が使用され、SERIALIZABLE 分離レベルによりファントムリードが防止されている。コメント（line 30）でも意図が明示されている。

### [LOW] TC-034 の対象リストに invoiceTransition.ts と invoice.ts が含まれていない

- **status**: fixed
- **evidence**: `src/__tests__/static/projectStructure.test.ts:155` に `"domain/models/invoice.ts"`、line 162 に `"domain/services/invoiceTransition.ts"` が追加されている。

## Regressions

なし。

## Contradictions

なし。
