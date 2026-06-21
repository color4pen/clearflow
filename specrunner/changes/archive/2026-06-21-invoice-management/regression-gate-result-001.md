# Regression Gate Result — invoice-management / Iteration 001

- **verdict**: needs-fix
- **checked-at**: 2026-06-21

## Summary

5件のファインディングを検証した。Finding 1（HIGH）は修正済みを確認。Finding 2/3（LOW, 重複）・Finding 4（MEDIUM）・Finding 5（LOW）の計4件が未修正のまま残存している。

---

## Finding 1 — [HIGH] invoiceTransition.test.ts が未作成

- **file**: `src/__tests__/domain/invoiceTransition.test.ts`
- **status**: FIXED
- **evidence**: ファイルが存在し、TC-001〜TC-006 の全6ケースが実装されている。`validateInvoiceTransition` を使った純粋関数テストが正しく記述されている。

---

## Finding 2 — [LOW] updateInvoiceStatusAction の revalidatePath がリスト画面のみ再検証（1件目）

- **file**: `src/app/actions/invoices.ts:111`
- **status**: NOT FIXED (regression)
- **severity**: high
- **resolution**: fixable
- **evidence**: `updateInvoiceStatusAction` のシグネチャは `(invoiceId: string, newStatus: string)` のままで `contractId` が追加されておらず、line 111 は `revalidatePath('/contracts')` のままである。契約詳細ページ（`/contracts/[id]`）のサーバーキャッシュが他ユーザー向けに即時更新されない問題が残存している。
- **fix-hint**: `updateInvoiceStatusAction` に `contractId: string` を追加し、`revalidatePath('/contracts')` を `revalidatePath('/contracts/${contractId}')` または `revalidatePath('/contracts/[id]', 'page')` に置き換える。

---

## Finding 3 — [LOW] updateInvoiceStatusAction の revalidatePath がリスト画面のみを再検証（2件目）

- **file**: `src/app/actions/invoices.ts:111`
- **status**: NOT FIXED (regression)
- **severity**: high
- **resolution**: fixable
- **evidence**: Finding 2 と同一の問題。`revalidatePath('/contracts')` のみが呼ばれており、契約詳細ページのキャッシュが更新されない。Finding 2 と重複するため、Finding 2 の修正で同時に解消される。

---

## Finding 4 — [MEDIUM] one_time 契約の金額上限チェックが並行 INSERT に対して安全でない（phantom read）

- **file**: `src/application/usecases/createInvoice.ts:33`
- **status**: NOT FIXED (regression)
- **severity**: high
- **resolution**: fixable
- **evidence**: `createInvoice.ts` の `db.transaction(async (tx) => { ... })` に明示的な分離レベルの指定がない。PostgreSQL デフォルトの READ COMMITTED のまま `sumAmountByContract` → `create` を実行しており、並行トランザクションが互いのコミット前に同一 SUM を読み取り、両者ともチェックを通過して INSERT できるファントムリードが依然として発生し得る。
- **fix-hint**: `db.transaction(async (tx) => { ... }, { isolationLevel: 'serializable' })` を指定して SERIALIZABLE 分離レベルを使用するか、DB 制約（例: 合計金額を管理する別テーブルと CHECK 制約）でガードする。

---

## Finding 5 — [LOW] TC-034 の対象リストに invoiceTransition.ts と invoice.ts が含まれていない

- **file**: `src/__tests__/static/projectStructure.test.ts:139`
- **status**: NOT FIXED (regression)
- **severity**: high
- **resolution**: fixable
- **evidence**: TC-034 の `files` 配列（lines 140-162）に `domain/models/invoice.ts` および `domain/services/invoiceTransition.ts` が追加されていない。TC-031 の `modelFiles` には `invoice.ts` が含まれているが、TC-034 の静的検証対象には含まれていない。`invoiceTransition.ts` は `domain/services/index.ts` に追記されているが TC-034 の対象外のため、将来 infrastructure import が混入しても検出されない。
- **fix-hint**: TC-034 の `files` 配列に `"domain/models/invoice.ts"` と `"domain/services/invoiceTransition.ts"` を追加する。
