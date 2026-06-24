# 契約・請求モデルの強化

## Meta

- **type**: spec-change
- **slug**: contract-invoice-strengthen
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: nullable → NOT NULL 変更とマイグレーション。既存パターンの延長で新しい設計選択なし → false -->

## 背景

売上管理の基盤として契約金額と請求日の管理が必要だが、契約の amount と startDate が nullable で売上集計の起点にならない。請求に issueDate がなく請求予定日と実際の発行日時を区別できない。請求金額の合計チェックも作成時のみで更新時には行われていない。

## 現状コードの前提

- `src/infrastructure/schema.ts:372` — contracts.amount は `integer("amount")` で nullable
- `src/infrastructure/schema.ts:373` — contracts.startDate は `timestamp("start_date")` で nullable
- `src/infrastructure/schema.ts:384-402` — invoices テーブルに issueDate カラムなし。invoicedAt は発行処理時のタイムスタンプ
- `src/application/usecases/createInvoice.ts:33-43` — 単発契約の合計金額チェックは createInvoice にのみ存在
- `src/infrastructure/schema.ts:394` — invoices.amount は `integer("amount").notNull()` で既に NOT NULL
- `src/infrastructure/schema.ts:395` — invoices.dueDate は `timestamp("due_date")` で nullable

## 要件

1. **Contract.amount を NOT NULL に変更**: マイグレーションで既存の null データにデフォルト値 0 を設定してから NOT NULL 制約を追加する
2. **Contract.startDate を NOT NULL に変更**: マイグレーションで既存の null データに createdAt の値を設定してから NOT NULL 制約を追加する
3. **Contract の CHECK 制約追加**: `start_date <= end_date`（end_date が NOT NULL の場合のみ）をアプリケーション層で検証する関数を追加する
4. **Contract.amount の正値チェック**: 契約の作成・更新時に amount > 0 をアプリケーション層で検証する
5. **Invoice に issueDate を追加**: invoices テーブルに `issue_date timestamp` (nullable) カラムを追加する。issueDate は「請求予定日」、invoicedAt は「実際の発行処理日時」として使い分ける
6. **Invoice.dueDate を NOT NULL に変更**: マイグレーションで既存 null データに適切なデフォルト値を設定する
7. **Invoice の日付検証**: 請求の作成・更新時に issueDate ≤ dueDate をアプリケーション層で検証する
8. **請求金額チェックを更新時にも適用**: updateInvoiceStatus 等で金額変更がある場合にも、単発契約の合計金額チェックを実施する

## スコープ外

- 売上集計ロジック（後続リクエスト R09 で実施）
- 請求画面の独立化（後続リクエスト R10 で実施）
- 契約の DB レベル CHECK 制約（アプリ層検証を優先、既存データとの互換性のため）

## 受け入れ基準

- [ ] contracts.amount が NOT NULL になっている
- [ ] contracts.start_date が NOT NULL になっている
- [ ] invoices テーブルに issue_date カラムが存在する
- [ ] invoices.due_date が NOT NULL になっている
- [ ] 契約作成時に amount ≤ 0 がバリデーションエラーになる
- [ ] 契約作成時に startDate > endDate がバリデーションエラーになる
- [ ] 請求作成時に issueDate > dueDate がバリデーションエラーになる
- [ ] 既存データのマイグレーションが正常に完了する
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **issueDate と invoicedAt を分離** — issueDate は請求予定日（事前に設定）、invoicedAt は発行処理の実行日時（ステータス遷移時に記録）。却下案: issueDate で統一 — 発行処理のタイムスタンプが失われる。却下案: invoicedAt のみ — 請求予定日が管理できない
