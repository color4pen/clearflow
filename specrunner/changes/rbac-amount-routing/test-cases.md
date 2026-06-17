# Test Cases: RBAC拡張と金額による承認経路の自動分岐

## Summary

- **Total**: 47 cases
- **Automated** (unit/integration): 33
- **Manual**: 14
- **Priority**: must: 30, should: 14, could: 3

---

## Unit Tests

### TC-001: roleEnum に manager と finance が存在する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ロール体系の拡張 > Scenario: roleEnum に manager と finance が存在する

---

### TC-002: Role 型が4値のユニオン型である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ロール体系の拡張 > Scenario: Role 型が4値のユニオン型である

---

### TC-003: selectTemplate — 金額100000 で少額テンプレートが選択される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: テンプレート自動選択 > Scenario: 金額10万円の申請に少額テンプレートが選択される

---

### TC-004: selectTemplate — 金額200000 で高額テンプレートが選択される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: テンプレート自動選択 > Scenario: 金額20万円の申請に高額テンプレートが選択される

---

### TC-005: selectTemplate — 金額未指定でデフォルトテンプレートが選択される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: テンプレート自動選択 > Scenario: 金額未指定の申請にデフォルトテンプレートが選択される

---

### TC-006: selectTemplate — 該当テンプレートなしで null が返される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: テンプレート自動選択 > Scenario: 該当テンプレートが存在しない場合はエラー

---

### TC-007: canApprove — manager が manager ステップを承認できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ロールベースの承認権限 > Scenario: manager ユーザーが manager ステップを承認できる

---

### TC-008: canApprove — manager が finance ステップを承認できない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ロールベースの承認権限 > Scenario: manager ユーザーが finance ステップを承認できない

---

### TC-009: canApprove — finance が finance ステップを承認できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ロールベースの承認権限 > Scenario: finance ユーザーが finance ステップを承認できる

---

### TC-010: canApprove — finance が manager ステップを承認できない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** 承認ステップの `approverRole` が `"manager"` である
**WHEN** `actorRole = "finance"` で `canApprove` を呼び出す
**THEN** false が返される

---

### TC-011: selectTemplate — 金額100001 で高額テンプレートが選択される（境界値）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** デフォルト（null/null）、少額（null/100000）、高額（100001/null）の3テンプレートが配列に存在する
**WHEN** `selectTemplate(templates, 100001)` を呼び出す
**THEN** 高額テンプレート（minAmount=100001）が返される

---

### TC-012: selectTemplate — 金額0 で少額テンプレートが選択される（境界値）

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** デフォルト（null/null）、少額（null/100000）、高額（100001/null）の3テンプレートが配列に存在する
**WHEN** `selectTemplate(templates, 0)` を呼び出す
**THEN** 少額テンプレート（maxAmount=100000）が返される

---

### TC-013: selectTemplate が純粋関数である

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 同一のテンプレート配列と金額が用意されている
**WHEN** `selectTemplate` を複数回呼び出す
**THEN** 毎回同一の結果が返され、外部状態を変更しない（副作用なし・DB アクセスなし）

---

### TC-014: Request 型に `amount: number | null` フィールドが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/request.ts` の `Request` 型定義
**WHEN** TypeScript の型チェックを実行する
**THEN** `amount: number | null` フィールドが存在し、コンパイルエラーが出ない

---

### TC-015: ApprovalTemplate 型に minAmount / maxAmount フィールドが存在する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/domain/models/approvalTemplate.ts` の `ApprovalTemplate` 型定義
**WHEN** TypeScript の型チェックを実行する
**THEN** `minAmount: number | null` と `maxAmount: number | null` フィールドが存在し、コンパイルエラーが出ない

---

### TC-033: listApprovalTemplatesAction が削除されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/actions/requests.ts` のソースコード
**WHEN** `listApprovalTemplatesAction` の定義を検索する
**THEN** 定義が存在しない

---

## Integration Tests

### TC-016: 金額ありの申請を作成すると DB に amount が保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルの金額カラム > Scenario: 金額ありの申請を作成する

---

### TC-017: 金額なしの申請を作成すると DB に amount=null が保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: requests テーブルの金額カラム > Scenario: 金額なしの申請を作成する

---

### TC-018: 金額範囲付きテンプレートが DB から正しく取得できる

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 承認テンプレートの金額条件 > Scenario: 金額範囲付きテンプレートが定義されている

---

### TC-019: createRequest が金額を受け取りテンプレートを自動選択する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createRequest の金額ベース移行 > Scenario: createRequest が金額を受け取りテンプレートを自動選択する

---

### TC-020: createRequest が amount を Request レコードに保存する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createRequest の金額ベース移行 > Scenario: createRequest が amount を Request レコードに保存する

---

### TC-021: manager ユーザーが approveRequestAction を試行できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: アクション層の承認・却下権限ゲート > Scenario: manager ユーザーが承認操作を試行できる

---

### TC-022: member ユーザーが approveRequestAction を拒否される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: アクション層の承認・却下権限ゲート > Scenario: member ユーザーが承認操作を拒否される

---

### TC-023: テンプレート自動選択結果が監査ログに記録される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: テンプレート自動選択の監査ログ > Scenario: テンプレート自動選択結果が監査ログに記録される

---

### TC-024: findByOrganizationForAmount — amount=null でデフォルトテンプレートのみ返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** デフォルト（minAmount=null, maxAmount=null）、少額（minAmount=null, maxAmount=100000）、高額（minAmount=100001, maxAmount=null）の3テンプレートが DB に存在する
**WHEN** `findByOrganizationForAmount(orgId, null)` を呼び出す
**THEN** デフォルトテンプレートのみが返され、少額・高額テンプレートは含まれない

---

### TC-025: findByOrganizationForAmount — amount 指定で範囲マッチするテンプレートを返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** デフォルト（null/null）、少額（null/100000）、高額（100001/null）の3テンプレートが DB に存在する
**WHEN** `findByOrganizationForAmount(orgId, 50000)` を呼び出す
**THEN** デフォルトと少額テンプレートが返され、高額テンプレートは含まれない

---

### TC-026: findByOrganizationForAmount — ORDER BY でデフォルトテンプレートが最後

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** デフォルト（null/null）と少額（null/100000）が DB に存在し、amount=50000 で検索する
**WHEN** `findByOrganizationForAmount(orgId, 50000)` を呼び出す
**THEN** 返される配列の最後の要素がデフォルトテンプレート（minAmount=null, maxAmount=null）である

---

### TC-027: createRequest が templateId を受け取らず amount を受け取る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `createRequest` usecase のインタフェース
**WHEN** `templateId` フィールドを含むオブジェクトを渡す
**THEN** TypeScript の型エラーが発生し、`amount` フィールドで呼び出すと正常に動作する

---

### TC-028: 監査ログの metadata に templateId, templateName, amount が含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 高額テンプレート（minAmount=100001）が存在する
**WHEN** `createRequest({ title: "出張費", amount: 200000, ... })` を実行する
**THEN** `audit_logs` に `action = "request.create"` のレコードが作成され、`metadata.templateId`、`metadata.templateName`、`metadata.amount = 200000` が含まれる

---

### TC-029: finance ロールのユーザーが approveRequestAction を試行できる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** ログインユーザーのロールが `"finance"` である
**WHEN** `approveRequestAction` を実行する
**THEN** アクション層の権限チェックを通過し、usecase に処理が委譲される（`role === "member"` ではないため拒否されない）

---

### TC-030: finance ロールのユーザーが rejectRequestAction を試行できる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** ログインユーザーのロールが `"finance"` である
**WHEN** `rejectRequestAction` を実行する
**THEN** アクション層の権限チェックを通過し、usecase に処理が委譲される

---

### TC-031: manager / finance ロールがセッションに正しく保持される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/infrastructure/auth.ts` のJWT・セッションコールバックが4値ロール体系に更新されている
**WHEN** `role = "manager"` のユーザーがログインし、セッションを取得する
**THEN** `session.user.role` が `"manager"` として返される（`"admin" | "member"` キャストによる切り詰めが発生しない）

---

### TC-032: admin ロールのユーザーが approveRequestAction を試行できる

**Category**: integration
**Priority**: should
**Source**: design.md > D5

**GIVEN** ログインユーザーのロールが `"admin"` である
**WHEN** `approveRequestAction` を実行する
**THEN** アクション層の権限チェックを通過する（`role === "member"` ではないため拒否されない）

---

## Manual Tests

### TC-034: 申請作成フォームにテンプレート選択 UI が存在しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: UI の金額入力への移行 > Scenario: 申請作成フォームにテンプレート選択UIが存在しない

---

### TC-035: 申請詳細画面に金額が表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: UI の金額入力への移行 > Scenario: 申請詳細画面に金額が表示される

---

### TC-036: シード実行後に3つのテンプレートが定義されている

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: シードデータの更新 > Scenario: 3つのテンプレートが定義される

---

### TC-037: シード実行後に manager / finance ロールのユーザーが存在する

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: シードデータの更新 > Scenario: manager と finance ロールのユーザーが存在する

---

### TC-038: 申請一覧テーブルに「金額」列が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 申請一覧ページを表示する
**WHEN** テーブルヘッダーを確認する
**THEN** 「金額」列が存在し、各行に金額またはハイフンが表示される

---

### TC-039: 申請一覧で金額 null の場合「-」と表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-09

**GIVEN** `amount = null` の申請が存在する
**WHEN** 申請一覧ページを表示する
**THEN** 該当行の「金額」列に「-」が表示される

---

### TC-040: 申請詳細で金額 null の場合「-」と表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-09

**GIVEN** `amount = null` の申請詳細ページを表示する
**WHEN** 金額セクションを確認する
**THEN** 「-」が表示される

---

### TC-041: 金額がある場合カンマ区切りの日本円表記で表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-09

**GIVEN** `amount = 150000` の申請が存在する
**WHEN** 申請一覧・詳細ページを表示する
**THEN** 金額が「150,000」のようにカンマ区切りで表示される

---

### TC-042: 申請作成フォームに金額入力フィールドが存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 申請作成ページを表示する
**WHEN** フォーム要素を確認する
**THEN** `name="amount"`, `type="number"`, `min="0"` の入力フィールドが存在し、ラベルが「金額（任意）」である

---

### TC-043: 金額は任意入力（空欄で申請を送信できる）

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** 申請作成フォームで金額フィールドを空欄にしたまま他の必須フィールドを入力する
**WHEN** フォームを送信する
**THEN** バリデーションエラーが発生せず申請が作成される

---

### TC-044: `bun run build` が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** すべてのコード変更が適用されている
**WHEN** `bun run build` を実行する
**THEN** ビルドエラーなしで完了する

---

### TC-045: `bunx tsc --noEmit` が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** すべてのコード変更が適用されている
**WHEN** `bunx tsc --noEmit` を実行する
**THEN** TypeScript の型エラーが0件で完了する

---

### TC-046: `bun run lint` が成功する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** すべてのコード変更が適用されている
**WHEN** `bun run lint` を実行する
**THEN** lint エラーが0件で完了する

---

### TC-047: `bun test` が全件 green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** すべてのコード変更とテスト更新（TC-047/TC-054 書き換えを含む）が適用されている
**WHEN** `bun test` を実行する
**THEN** 全テストケースが green で完了する

---

## Result

```yaml
result: completed
total: 47
automated: 33
manual: 14
must: 30
should: 14
could: 3
blocked_reasons: []
```
