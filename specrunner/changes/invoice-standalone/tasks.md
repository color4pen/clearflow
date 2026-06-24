# Tasks: invoice-standalone

## T-01: overdue → paid 遷移の追加

- [ ] `src/domain/services/invoiceTransition.ts` の `VALID_INVOICE_TRANSITIONS` で `overdue` の遷移先に `"paid"` を追加する
- [ ] コメント「paid と overdue は終端状態」を「paid は終端状態」に修正する
- [ ] 既存の `validateInvoiceTransition` テストがあれば overdue → paid の成功ケースを追加する

**Acceptance Criteria**:
- `validateInvoiceTransition("overdue", "paid")` が `{ ok: true }` を返す
- `validateInvoiceTransition("overdue", "invoiced")` は依然として `{ ok: false, ... }` を返す
- `validateInvoiceTransition("paid", "overdue")` は依然として `{ ok: false, ... }` を返す

## T-02: updateInvoiceStatus に paidAt パラメータを追加

- [ ] `src/application/usecases/updateInvoiceStatus.ts` の入力型に `paidAt?: Date` を追加する
- [ ] `additionalFields` の `paidAt` 設定を `data.paidAt ?? new Date()` に変更する（ユーザー指定があればそれを使用、なければ現在日時）
- [ ] `src/app/actions/invoices.ts` の `updateInvoiceStatusAction` に `paidAt` パラメータを追加する。paid 遷移時のみ paidAt を受け取るようにする
- [ ] `updateInvoiceStatusAction` の先頭に `createInvoiceAction` と同様の `checkRateLimit` 呼び出しを追加する
- [ ] Server Action の入力バリデーション（zod スキーマ `updateInvoiceStatusSchema`）に `paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` を追加する。`<input type="date">` は `YYYY-MM-DD` 形式の文字列を出力するため、`z.string().datetime()` は使用しないこと
- [ ] `updateInvoiceStatusSchema` の `paidAt` に対して、未来日付を拒否するバリデーションを追加する（`.refine(val => !val || val <= new Date().toISOString().slice(0, 10), { message: "入金日は本日以前の日付を指定してください" })`）

**Acceptance Criteria**:
- `updateInvoiceStatus({ ..., newStatus: "paid", paidAt: new Date("2026-06-20") })` で `paidAt` が指定値で保存される
- `updateInvoiceStatus({ ..., newStatus: "paid" })` で `paidAt` が `new Date()` で保存される（既存動作を維持）
- `updateInvoiceStatusAction` が `paidAt` を受け取り、ユースケースに渡せる

## T-03: getInvoice ユースケースの新設

- [ ] `src/application/usecases/getInvoice.ts` を新規作成する
- [ ] 入力: `{ invoiceId: string; organizationId: string }`
- [ ] `invoiceRepository.findById` で請求を取得する。存在しない場合は `null` を返す
- [ ] `contractRepository.findById` で紐づく契約を取得する。契約が存在しない場合も `null` を返す
- [ ] 返却型: `{ invoice: Invoice; contract: Contract } | null`
- [ ] `src/application/usecases/index.ts` に `getInvoice` を追加する

**Acceptance Criteria**:
- `getInvoice({ invoiceId, organizationId })` が請求と契約の両方を含むオブジェクトを返す
- 存在しない invoiceId を指定すると `null` が返る
- organizationId が異なる請求を指定すると `null` が返る（マルチテナント分離）

## T-04: 請求詳細ページの新設

- [ ] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` を新規作成する
- [ ] `getInvoice` ユースケースでデータを取得する。取得できない場合は `notFound()` を呼ぶ
- [ ] URL の `id`（contractId）と請求の `contractId` が一致しない場合は `notFound()` を呼ぶ
- [ ] パンくずリスト: 「契約一覧 > 契約詳細 > 請求詳細」を表示する。契約一覧は `/contracts`、契約詳細は `/contracts/[id]` へのリンク
- [ ] 請求基本情報セクション: タイトル、金額、請求日、支払期日、入金日、ステータス、備考を表示する
- [ ] 紐づく契約へのリンクを表示する
- [ ] ステータス操作ボタンコンポーネント（T-05）を配置する
- [ ] 権限チェック: `canPerform(role, "invoice", "changeStatus")` が false の場合は操作ボタンを非表示にする

**Acceptance Criteria**:
- `/contracts/{contractId}/invoices/{invoiceId}` で請求詳細が表示される
- パンくずリスト「契約一覧 > 契約詳細 > 請求詳細」が表示される
- 紐づく契約へのリンクが表示される
- URL の contractId と請求の contractId が不一致の場合に 404 が返る

## T-05: 請求詳細ページのステータス操作ボタンと入金日ダイアログ

- [ ] `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx` を新規作成する（Client Component）
- [ ] ステータスに応じた操作ボタンを表示する:
  - scheduled: 「発行する」ボタン（invoiced に遷移）
  - invoiced: 「入金確認」ボタン、「期日超過にする」ボタン
  - overdue: 「入金確認」ボタン
  - paid: 操作ボタンなし
- [ ] 入金確認ボタン押下時に入金日入力ダイアログを表示する。デフォルト値は `<input type="date">` に現在の日付を設定する
- [ ] ダイアログの確認ボタン押下で `updateInvoiceStatusAction` を呼び出す。paidAt を含めて送信する
- [ ] 操作成功時は `router.refresh()` でページを再描画する
- [ ] 操作失敗時はエラーメッセージを表示する
- [ ] 送信中は全ボタンを `disabled` にする

**Acceptance Criteria**:
- scheduled → 「発行する」ボタンのみ表示される
- invoiced → 「入金確認」「期日超過にする」の 2 ボタンが表示される
- overdue → 「入金確認」ボタンのみ表示される
- paid → 操作ボタンが表示されない
- 「入金確認」押下で入金日ダイアログが表示される
- ダイアログのデフォルト値が現在日付である

## T-06: 請求登録ページの新設

- [ ] `src/app/(dashboard)/contracts/[id]/invoices/new/page.tsx` を新規作成する
- [ ] `contractRepository.findById` で契約を取得する。存在しない場合は `notFound()`
- [ ] 契約が active でない場合はフォームを表示せず、メッセージを表示する
- [ ] パンくずリスト: 「契約一覧 > 契約詳細 > 請求登録」を表示する
- [ ] `src/app/(dashboard)/contracts/[id]/invoices/new/NewInvoiceForm.tsx` を新規作成する（Client Component）
- [ ] 入力フィールド: タイトル（必須）、金額（必須）、請求日（任意）、支払期日（必須）、備考（任意）
- [ ] `contractId` は hidden input で自動設定する
- [ ] フォーム送信で `createInvoiceAction` を呼び出す
- [ ] 作成成功時は `/contracts/[id]` にリダイレクトする
- [ ] 作成失敗時はエラーメッセージを表示する
- [ ] 単発契約の場合に残り請求可能金額を表示する（T-07）

**Acceptance Criteria**:
- `/contracts/{contractId}/invoices/new` で請求登録フォームが表示される
- パンくずリスト「契約一覧 > 契約詳細 > 請求登録」が表示される
- フォーム送信で請求が作成される
- active でない契約では作成フォームが表示されない

## T-07: 単発契約の残り請求可能金額表示とバリデーション

- [ ] 請求登録ページ（T-06）の Server Component で、one_time 契約の場合に `invoiceRepository.sumAmountByContract` で既存合計を取得する
- [ ] 残り請求可能金額（`contract.amount - existingTotal`）を props として `NewInvoiceForm` に渡す
- [ ] `NewInvoiceForm` で残り請求可能金額を表示する（one_time 契約の場合のみ）
- [ ] 金額入力時にバリデーション: 請求日 > 支払期日の場合にクライアントサイドでエラー表示する。サーバーサイドバリデーション（`createInvoice` ユースケース）は既存のまま利用する
- [ ] 超過バリデーションはサーバーサイド（`createInvoice` ユースケース内の既存ロジック）に委ねる。クライアントサイドでは残り金額の表示のみ行う

**Acceptance Criteria**:
- one_time 契約で残り請求可能金額が表示される
- recurring 契約では残り請求可能金額が表示されない
- 請求日 > 支払期日の入力でエラーメッセージが表示される
- 合計が契約金額を超過する場合にサーバーサイドエラーが表示される

## T-08: 契約詳細の InvoiceSection 簡素化

- [ ] `src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` を修正する
- [ ] テーブルの各行にリンクを追加する。リンク先は `/contracts/[id]/invoices/[invoiceId]`。`DataTable` の行にリンクを含める、または `RowClickHandler` を使用する
- [ ] `InvoiceStatusButtons` のインライン表示（テーブルの actions 列）を削除する
- [ ] `CreateInvoiceModal` コンポーネントのインポートと使用を削除する
- [ ] 「請求を追加」ボタンを `/contracts/[id]/invoices/new` へのリンク（`Link` コンポーネント）に置き換える
- [ ] サマリー表示（請求済合計、入金済合計、未請求合計）は維持する
- [ ] `src/app/(dashboard)/contracts/[id]/CreateInvoiceModal.tsx` を削除する
- [ ] `src/app/(dashboard)/contracts/[id]/InvoiceStatusButtons.tsx` を削除する

**Acceptance Criteria**:
- 契約詳細の請求セクションに各請求の詳細ページへのリンクが表示される
- インラインのステータス操作ボタンが表示されない
- 「請求を追加」が `/contracts/{contractId}/invoices/new` へのリンクである
- サマリー表示が維持されている
- `CreateInvoiceModal.tsx` と `InvoiceStatusButtons.tsx` が削除されている

## T-09: Server Action の revalidatePath 更新

- [ ] `src/app/actions/invoices.ts` の `updateInvoiceStatusAction` で、`revalidatePath` に請求詳細ページのパスも追加する（`/contracts/${contractId}/invoices/${invoiceId}`）
- [ ] `createInvoiceAction` の `revalidatePath` に `/contracts/${contractId}` が含まれていることを確認する（既存で対応済み）
- [ ] `updateInvoiceStatusAction` のシグネチャを確認し、T-02 で追加した `paidAt` パラメータが正しく受け渡しされることを確認する

**Acceptance Criteria**:
- ステータス更新後に請求詳細ページと契約詳細ページの両方が revalidate される
- 請求作成後に契約詳細ページが revalidate される

## T-10: typecheck と test の確認

- [ ] `bun run build` が成功することを確認する
- [ ] 型エラーがないことを確認する
- [ ] 既存テストが green であることを確認する
- [ ] 削除した `CreateInvoiceModal` や `InvoiceStatusButtons` を参照している箇所がないことを確認する

**Acceptance Criteria**:
- `bun run build` が成功する
- 型チェックエラーがない
- 全テストが green
