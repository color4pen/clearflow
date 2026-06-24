# 請求画面の独立化

## Meta

- **type**: spec-change
- **slug**: invoice-standalone
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 画面構成の変更。既存パターンの延長 → false -->

## 背景

画面仕様では請求は独立した詳細・登録画面を持つが、現在は契約詳細画面に埋め込まれている。請求のステータス操作（発行、入金確認、期日超過）を独立画面で行えるようにし、経理の業務フローを改善する。

## 現状コードの前提

- `src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx` — 請求一覧と操作が契約詳細画面のセクションとして埋め込まれている
- 請求の詳細ページ（`/invoices/[id]`）は存在しない
- 請求の登録ページ（`/contracts/[id]/invoices/new` 等）は存在しない
- 請求のステータス更新は `src/application/usecases/updateInvoiceStatus.ts` で実装済み。paidAt はユースケース内で `new Date()` で自動設定されており、ユーザー入力を受け付けない
- 請求の作成は `src/application/usecases/createInvoice.ts` で実装済み
- `src/domain/services/invoiceTransition.ts` — 遷移ルール: scheduled→invoiced, invoiced→paid, invoiced→overdue。overdue→paid は未定義
- getInvoice（単一請求の取得）ユースケースは存在しない

## 要件

1. **getInvoice ユースケースの新設**: `getInvoice(invoiceId, organizationId)` ユースケースを新設する。請求詳細ページのデータ取得に使用する。紐づく契約情報も合わせて返す
2. **overdue → paid 遷移の追加**: `invoiceTransition` ドメインサービスに `overdue → paid` 遷移を追加する。遅延入金の確認は業務上必要な操作である
3. **updateInvoiceStatus に paidAt パラメータを追加**: `updateInvoiceStatus` ユースケースに `paidAt?: Date` パラメータを追加する。paid 遷移時にユーザーが指定した入金日を使用する。未指定の場合は `new Date()` をフォールバックとする
4. **請求詳細ページの新設**: `/contracts/[id]/invoices/[invoiceId]` にページを作成する。`getInvoice` でデータを取得し、基本情報（金額、請求日、支払期日、入金日、ステータス）の表示と編集、ステータス操作ボタン、紐づく契約へのリンクを含む
5. **請求のステータス操作**: status に応じたアクションボタンを表示する。scheduled → 「発行する」、invoiced → 「入金確認」「期日超過にする」、overdue → 「入金確認」、paid → 操作なし。入金確認時は入金日入力ダイアログを表示する（デフォルト値: 現在日時）
6. **請求登録ページの新設**: `/contracts/[id]/invoices/new` にページを作成する。contractId は URL パラメータから自動設定。金額、請求日、支払期日の入力。単発契約の場合は残り請求可能金額を表示する
7. **バリデーション表示**: 請求日 > 支払期日の場合はエラー表示。単発契約で合計が契約金額を超過する場合はエラー表示（残り金額を表示）
8. **契約詳細の請求セクションを簡素化**: InvoiceSection を一覧表示 + 各請求の詳細ページへのリンクに変更する。インラインでのステータス操作は削除し、詳細ページに集約する。既存の CreateInvoiceModal があれば削除し、請求登録ページへのリンクに置き換える
9. **パンくずリスト**: 契約一覧 → 契約詳細 → 請求詳細 の階層を表示する

## スコープ外

- 請求一覧ページ（`/invoices`）の新設（経理ダッシュボード R06 で代替）
- 請求の一括操作（一括発行、一括入金確認）

## 受け入れ基準

- [ ] `getInvoice` ユースケースが存在し、請求と契約情報を返す
- [ ] `invoiceTransition` で overdue → paid 遷移が許可される
- [ ] `updateInvoiceStatus` が paidAt パラメータを受け取る
- [ ] `/contracts/[id]/invoices/[invoiceId]` で請求詳細が表示される
- [ ] 各ステータスに応じた操作ボタンが表示される
- [ ] 入金確認操作で入金日入力ダイアログが表示される
- [ ] `/contracts/[id]/invoices/new` で請求が作成できる
- [ ] 単発契約の場合に残り請求可能金額が表示される
- [ ] バリデーションエラーが正しく表示される
- [ ] 契約詳細の請求セクションから請求詳細にリンクで遷移できる
- [ ] パンくずリストが正しく表示される
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **overdue → paid 遷移を許可する** — 遅延入金は業務上頻繁に発生する。overdue を終端状態にすると入金確認ができなくなる。却下案: overdue を終端状態のまま — 入金確認ボタンを削除することになり業務に支障がある
2. **paidAt をユーザー入力にする** — 入金日は銀行口座の入金確認日であり、操作日時と一致しない場合がある。デフォルト値を現在日時にして手間を減らしつつ、変更可能にする。却下案: 自動設定のみ — 実際の入金日と操作日がずれた場合に修正できない
