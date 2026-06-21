# Test Cases: invoice-management

## Summary

- **Total**: 57 cases
- **Automated** (unit/integration): 41
- **Manual**: 16
- **Priority**: must: 41, should: 16, could: 0

---

### TC-001: scheduled から invoiced への遷移が許可される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス遷移ルール > Scenario: scheduled から invoiced への遷移が許可される

---

### TC-002: invoiced から paid への遷移が許可される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス遷移ルール > Scenario: invoiced から paid への遷移が許可される

---

### TC-003: invoiced から overdue への遷移が許可される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス遷移ルール > Scenario: invoiced から overdue への遷移が許可される

---

### TC-004: paid からの遷移が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス遷移ルール > Scenario: paid からの遷移が拒否される

---

### TC-005: overdue からの遷移が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス遷移ルール > Scenario: overdue からの遷移が拒否される

---

### TC-006: scheduled から paid への直接遷移が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス遷移ルール > Scenario: scheduled から paid への直接遷移が拒否される

---

### TC-007: one_time 契約で合計金額が契約金額以内の場合に請求が作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: one_time 契約での請求合計金額チェック > Scenario: one_time 契約で合計金額が契約金額以内の場合に請求が作成される

---

### TC-008: one_time 契約で合計金額が契約金額を超える場合にエラーが返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: one_time 契約での請求合計金額チェック > Scenario: one_time 契約で合計金額が契約金額を超える場合にエラーが返る

---

### TC-009: recurring 契約で合計金額チェックがスキップされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: one_time 契約での請求合計金額チェック > Scenario: recurring 契約で合計金額チェックがスキップされる

---

### TC-010: one_time 契約で contract.amount が null の場合にチェックがスキップされる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: one_time 契約での請求合計金額チェック > Scenario: one_time 契約で contract.amount が null の場合にチェックがスキップされる

---

### TC-011: active 契約への請求作成が許可される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求作成時に契約ステータスを検証 > Scenario: active 契約への請求作成が許可される

---

### TC-012: completed 契約への請求作成が拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求作成時に契約ステータスを検証 > Scenario: completed 契約への請求作成が拒否される

---

### TC-013: invoiced 遷移時に invoicedAt がセットされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス変更時の日時自動セット > Scenario: invoiced 遷移時に invoicedAt がセットされる

---

### TC-014: paid 遷移時に paidAt がセットされる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求ステータス変更時の日時自動セット > Scenario: paid 遷移時に paidAt がセットされる

---

### TC-015: admin が請求を作成できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求操作の権限制御 > Scenario: admin が請求を作成できる

---

### TC-016: member が請求を作成しようとするとエラーになる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 請求操作の権限制御 > Scenario: member が請求を作成しようとするとエラーになる

---

### TC-017: 自テナントの請求のみ取得される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テナント分離 > Scenario: 自テナントの請求のみ取得される

---

### TC-018: 請求作成時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログ記録 > Scenario: 請求作成時に監査ログが記録される

---

### TC-019: ステータス変更時に監査ログが記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 監査ログ記録 > Scenario: ステータス変更時に監査ログが記録される

---

### TC-020: InvoiceStatus 型が正しい値を持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/invoice.ts` が存在する
**WHEN** `InvoiceStatus` 型を参照する
**THEN** `"scheduled" | "invoiced" | "paid" | "overdue"` の4つのリテラル型のみで構成される

---

### TC-021: Invoice 型が全フィールドを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/domain/models/invoice.ts` が存在する
**WHEN** `Invoice` 型を参照する
**THEN** `id`, `organizationId`, `contractId`, `title`, `amount`, `dueDate`, `status`, `invoicedAt`, `paidAt`, `notes`, `createdAt`, `updatedAt` の全フィールドが定義され、各フィールドの型が仕様と一致する（`dueDate: Date | null`, `invoicedAt: Date | null`, `paidAt: Date | null`, `notes: string | null`）

---

### TC-022: invoiceStatusEnum が正しい値で定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` を参照する
**WHEN** `invoiceStatusEnum` の値一覧を確認する
**THEN** `["scheduled", "invoiced", "paid", "overdue"]` の4値のみで定義されている

---

### TC-023: invoices テーブルが全カラムを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` を参照する
**WHEN** `invoices` テーブル定義を確認する
**THEN** `id`（uuid PK）、`organizationId`（uuid NOT NULL）、`contractId`（uuid NOT NULL）、`title`（text NOT NULL）、`amount`（integer NOT NULL）、`dueDate`（timestamp nullable）、`status`（invoiceStatusEnum NOT NULL default "scheduled"）、`invoicedAt`（timestamp nullable）、`paidAt`（timestamp nullable）、`notes`（text nullable）、`createdAt`、`updatedAt` の全カラムが存在する

---

### TC-024: invoices テーブルに FK 制約がある

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` を参照する
**WHEN** `invoices` テーブルの FK 制約を確認する
**THEN** `organizationId` は `organizations` テーブルへの FK を持ち、`contractId` は `contracts` テーブルへの FK を持つ

---

### TC-025: invoicesRelations が organization と contract への relation を持つ

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/schema.ts` を参照する
**WHEN** `invoicesRelations` の定義を確認する
**THEN** `organization` への `one()` relation と `contract` への `one()` relation が両方定義されている

---

### TC-026: contractsRelations に invoices の many relation が含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/schema.ts` を参照する
**WHEN** `contractsRelations` の定義を確認する
**THEN** `invoices: many(invoices)` が含まれている

---

### TC-027: organizationsRelations に invoices の many relation が含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/schema.ts` を参照する
**WHEN** `organizationsRelations` の定義を確認する
**THEN** `invoices: many(invoices)` が含まれている

---

### TC-028: sumAmountByContract が SQL SUM を使用する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 同一契約・同一組織に紐づく請求が複数存在する
**WHEN** `invoiceRepository.sumAmountByContract(contractId, organizationId)` を呼び出す
**THEN** JS 側で集計するのではなく DB の `SUM(amount)` クエリが発行され、正しい合計値が返される

---

### TC-029: sumAmountByContract は請求が存在しない場合に 0 を返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 指定した contractId に紐づく請求が 0 件である
**WHEN** `invoiceRepository.sumAmountByContract(contractId, organizationId)` を呼び出す
**THEN** `0` が返される（null や undefined ではない）

---

### TC-030: findAllByContract が createdAt 昇順で返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 同一契約に紐づく請求が複数件、異なる `createdAt` で存在する
**WHEN** `invoiceRepository.findAllByContract(contractId, organizationId)` を呼び出す
**THEN** `createdAt` の昇順（古い順）で請求一覧が返される

---

### TC-031: manager ロールのユーザーが請求を作成できる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** ユーザーのロールが `manager` であり、active な契約が存在する
**WHEN** `createInvoiceAction` を呼び出す
**THEN** 請求が正常に作成され、エラーが返されない

---

### TC-032: createInvoiceAction の amount に 0 を渡すと拒否される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `createInvoiceAction` に `amount: 0` を含む FormData を渡す
**WHEN** Zod バリデーションが実行される
**THEN** バリデーションエラーが返され、ユースケースは呼び出されない

---

### TC-033: createInvoiceAction の title が空文字の場合に拒否される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `createInvoiceAction` に `title: ""` を含む FormData を渡す
**WHEN** Zod バリデーションが実行される
**THEN** バリデーションエラーが返され、ユースケースは呼び出されない

---

### TC-034: createInvoiceAction の title が 255 文字を超える場合に拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** `createInvoiceAction` に 256 文字の `title` を含む FormData を渡す
**WHEN** Zod バリデーションが実行される
**THEN** バリデーションエラーが返される

---

### TC-035: createInvoiceAction の notes が 1000 文字を超える場合に拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** `createInvoiceAction` に 1001 文字の `notes` を含む FormData を渡す
**WHEN** Zod バリデーションが実行される
**THEN** バリデーションエラーが返される

---

### TC-036: updateInvoiceStatusAction の newStatus に無効な値を渡すと拒否される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `updateInvoiceStatusAction` に `newStatus: "pending"` など列挙外の文字列を渡す
**WHEN** Zod バリデーションが実行される
**THEN** バリデーションエラーが返され、ユースケースは呼び出されない

---

### TC-037: createInvoiceAction にレート制限が適用される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 同一ユーザーがレート制限の閾値を超えるリクエストを連続で送信する
**WHEN** `createInvoiceAction` が繰り返し呼び出される
**THEN** 閾値超過後のリクエストがレート制限エラーで拒否される

---

### TC-038: invoiceStatusLabels が全4ステータスのラベルを持つ

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)/labels.ts` を参照する
**WHEN** `invoiceStatusLabels` を確認する
**THEN** `scheduled: "予定"`, `invoiced: "請求済"`, `paid: "入金済"`, `overdue: "期日超過"` の4エントリが定義されている

---

### TC-039: 契約詳細ページに請求一覧セクションが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** active な契約が存在し、その契約詳細ページ（`/contracts/[id]`）を開く
**WHEN** ページを表示する
**THEN** 「請求一覧」セクションが表示され、請求名・金額・支払期日・ステータスの列を持つ DataTable が確認できる

---

### TC-040: 請求サマリー（請求済/入金済/未請求合計）が表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** 請求が複数件（paid, invoiced, scheduled）存在する契約詳細ページを開く
**WHEN** ページを表示する
**THEN** 請求済合計・入金済合計・未請求合計が正しく算出されて表示される

---

### TC-041: scheduled 行に「請求書発行」ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** ステータスが `scheduled` の請求が一覧に存在し、admin または manager でログインしている
**WHEN** 請求一覧を確認する
**THEN** 該当行に「請求書発行」ボタンが表示される

---

### TC-042: invoiced 行に「入金確認」と「期日超過」ボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** ステータスが `invoiced` の請求が一覧に存在し、admin または manager でログインしている
**WHEN** 請求一覧を確認する
**THEN** 該当行に「入金確認」ボタンと「期日超過」ボタンの両方が表示される

---

### TC-043: paid および overdue 行にステータス変更ボタンが表示されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** ステータスが `paid` または `overdue` の請求が一覧に存在する
**WHEN** 請求一覧を確認する
**THEN** 該当行にステータス変更ボタンが表示されない（終端状態）

---

### TC-044: admin/manager 以外にはステータス変更ボタンと「請求を追加」ボタンが非表示

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `member` ロールのユーザーが契約詳細ページを開く
**WHEN** ページを表示する
**THEN** ステータス変更ボタン（「請求書発行」「入金確認」「期日超過」）と「請求を追加」ボタンがいずれも表示されない

---

### TC-045: 「請求を追加」ボタンからモーダルが開く

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** admin または manager でログインし、active な契約の詳細ページを表示している
**WHEN** 「請求を追加」ボタンをクリックする
**THEN** タイトル・金額・支払期日・備考の入力フィールドを持つモーダルが開く

---

### TC-046: フォーム送信で請求が作成される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 請求追加モーダルが開いている
**WHEN** タイトル・金額を入力してフォームを送信する
**THEN** 請求が作成され、一覧に新しい行が追加される

---

### TC-047: バリデーションエラーがモーダル内に表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** 請求追加モーダルが開いている
**WHEN** 必須フィールド（タイトルまたは金額）を空にしてフォームを送信する
**THEN** モーダルが閉じずにエラーメッセージが表示される

---

### TC-048: 成功時にモーダルが閉じ一覧が更新される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** 請求追加モーダルで有効な値を入力してフォームを送信し、請求が正常に作成された
**WHEN** 送信が完了する
**THEN** モーダルが閉じ、請求一覧に新しい請求が表示される

---

### TC-049: シード実行後に DX推進プロジェクト契約に3件の請求が存在する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** `bun run db:seed`（または相当のシード実行コマンド）を実行する
**WHEN** DX推進プロジェクトの契約に紐づく請求を確認する
**THEN** 着手金（paid）・中間金（invoiced）・残金（scheduled）の3件が存在し、各ステータスと日時フィールドが正しい

---

### TC-050: シードデータの請求金額合計が 3000 万円である

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** シード実行後の DX推進プロジェクト契約の請求3件を確認する
**WHEN** 各請求の amount を合計する
**THEN** 900万 + 900万 + 1200万 = 3000万円となり、契約金額と一致する

---

### TC-051: invoices の truncation 順序が FK 制約に違反しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** `src/infrastructure/seed.ts` を確認する
**WHEN** truncation 処理の順序を確認する
**THEN** `invoices` の削除が `contracts` の削除より前に実行されている

---

### TC-052: マイグレーションファイルが生成されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** `bunx drizzle-kit generate` が実行されている
**WHEN** `drizzle/` ディレクトリを確認する
**THEN** `invoice_status` enum の追加と `invoices` テーブルの作成を含むマイグレーションファイルが存在する

---

### TC-053: bun run build が成功する

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全実装が完了した状態でリポジトリが存在する
**WHEN** `bun run build` を実行する
**THEN** エラーなくビルドが完了する

---

### TC-054: typecheck が green である

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 全実装が完了した状態でリポジトリが存在する
**WHEN** TypeScript 型チェックを実行する
**THEN** 型エラーが 0 件である

---

### TC-055: 依存方向 actions → usecases → domain/infrastructure を遵守している

**Category**: unit
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** `src/app/actions/invoices.ts`、`src/application/usecases/` 以下の Invoice 関連ファイル、`src/infrastructure/` のファイルが実装されている
**WHEN** import 依存関係を確認する
**THEN** `actions` が `usecases` に依存し、`usecases` が `domain` または `infrastructure` に依存しており、逆方向の依存が存在しない

---

### TC-056: invoice.ts がモデルファイル一覧に含まれる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** `src/__tests__/static/projectStructure.test.ts` を確認する
**WHEN** モデルファイル一覧の TC-031 を参照する
**THEN** `"domain/models/invoice.ts"` がリストに含まれている

---

### TC-057: invoiceRepository の全メソッドにテナント分離テストが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-14

**GIVEN** テナント分離テストファイルを確認する
**WHEN** `invoiceRepository` に関するテストケースを確認する
**THEN** `create`、`findById`、`findAllByContract`、`update`、`updateStatus`、`sumAmountByContract` の各メソッドに対して organizationId 条件の検証テストが存在し、`invoices action uses session.user.organizationId` のテストも存在する

---

## Result

```yaml
result: completed
total: 57
automated: 41
manual: 16
must: 41
should: 16
could: 0
blocked_reasons: []
```
