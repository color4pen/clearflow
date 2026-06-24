# Test Cases: ダッシュボードの実装

## Summary

- **Total**: 38 cases
- **Automated** (unit/integration): 19
- **Manual**: 19
- **Priority**: must: 18, should: 18, could: 2

---

## Section 1: ルーティング・ナビゲーション

### TC-001: 未認証ユーザーが / にアクセスすると /dashboard 経由でログインページへ遷移する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Root redirect targets /dashboard > Scenario: Unauthenticated user visits /

---

### TC-002: 認証済みユーザーが / にアクセスすると /dashboard に遷移しダッシュボードが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Root redirect targets /dashboard > Scenario: Authenticated user visits /

---

### TC-003: member ロールのユーザーが /dashboard にアクセスすると営業ダッシュボードが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Role-based dashboard routing > Scenario: Member user sees sales dashboard

---

### TC-004: finance ロールのユーザーが /dashboard にアクセスすると経理ダッシュボードが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Role-based dashboard routing > Scenario: Finance user sees finance dashboard

---

### TC-005: ナビゲーションにダッシュボードリンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Navigation dashboard link > Scenario: Dashboard link visible in navigation

---

### TC-006: ナビゲーションのダッシュボードリンクが最初の項目として配置されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-11

**GIVEN** ログイン済みユーザーが (dashboard) layout 内のいずれかのページを表示している
**WHEN** グローバルナビゲーションを確認する
**THEN** 「ダッシュボード」リンクが nav 内の最初のリンクとして配置されており、既存リンク（顧客、案件等）より前に表示される

---

## Section 2: 営業ダッシュボード — アクション待ちリスト

### TC-007: 複数種別のアイテムが期日順に統合表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Sales dashboard action list aggregation > Scenario: Aggregated action list with mixed item types

---

### TC-008: アクション待ちアイテムが存在しない場合に空状態メッセージが表示される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Sales dashboard action list aggregation > Scenario: Empty action list

---

### TC-009: dueDate が null のアイテムはソート後の末尾に配置される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `buildActionableItems` に dueDate あり（明日）の承認リクエスト 1 件と dueDate なし（null）の引合 2 件を渡す
**WHEN** 関数を実行する
**THEN** 戻り値は [承認リクエスト（明日）, 引合1, 引合2] の順になる

---

### TC-010: 入力データが空の場合に空配列を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `buildActionableItems` に requests=[], meetings=[], inquiries=[] を渡す
**WHEN** 関数を実行する
**THEN** 戻り値は空配列 `[]` である

---

## Section 3: 営業ダッシュボード — パイプラインサマリ

### TC-011: 複数フェーズに案件がある場合にフェーズ別件数と金額が表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Sales dashboard pipeline summary > Scenario: Pipeline summary with deals in multiple phases

---

### TC-012: 案件が 0 件のフェーズも常に全 5 フェーズが出力に含まれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `buildPipelineSummary` に proposal_prep フェーズの案件 2 件のみを渡す（他フェーズは 0 件）
**WHEN** 関数を実行する
**THEN** 戻り値に proposal_prep, proposed, negotiation, won, lost の 5 フェーズすべてが含まれ、案件のないフェーズは count: 0, totalAmount: 0 となる

---

### TC-013: estimatedAmount が null の案件は件数に含まれるが金額集計から除外される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `buildPipelineSummary` に negotiation フェーズの案件 2 件（estimatedAmount: 1,000,000 と null）を渡す
**WHEN** 関数を実行する
**THEN** negotiation の count は 2、totalAmount は 1,000,000 となる

---

### TC-014: パイプラインサマリのフェーズをクリックすると /deals?phase={phase} に遷移する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** member ロールのユーザーが営業ダッシュボードを表示している
**WHEN** パイプラインサマリの `proposal_prep` フェーズ行をクリックする
**THEN** `/deals?phase=proposal_prep` に遷移し、そのフェーズでフィルタされた案件一覧が表示される

---

## Section 4: 営業ダッシュボード — 直近の活動

### TC-015: 組織の最新 20 件の監査ログが新しい順に表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: Sales dashboard recent activity > Scenario: Recent activity display

---

### TC-016: 監査ログの各エントリに対象エンティティへのリンクが含まれる

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-07

**GIVEN** member ロールのユーザーが営業ダッシュボードを表示しており、監査ログに targetType="deal", targetId="deal-123" のエントリが存在する
**WHEN** 直近の活動セクションを確認する
**THEN** 該当エントリに `/deals/deal-123` へのリンクが含まれる

---

## Section 5: 営業ダッシュボード — 停滞案件

### TC-017: manager ロールには updatedAt が 14 日以上前の non-terminal 案件が停滞案件として表示される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Sales dashboard stale deals for managers > Scenario: Manager sees stale deals

---

### TC-018: member ロールには停滞案件セクションが表示されない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Sales dashboard stale deals for managers > Scenario: Member does not see stale deals

---

### TC-019: フェーズが won の案件は updatedAt が古くても停滞案件リストに含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Sales dashboard stale deals for managers > Scenario: Won/lost deals excluded from stale list

---

### TC-020: updatedAt が 10 日前の案件は停滞案件リストに含まれない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `filterStaleDeals` に updatedAt が現在から 10 日前の negotiation フェーズの案件と、updatedAt が現在から 20 日前の proposal_prep フェーズの案件を渡す（thresholdDays=14）
**WHEN** 関数を実行する
**THEN** 戻り値には 20 日前の案件のみが含まれ、10 日前の案件は含まれない

---

### TC-021: admin ロールには停滞案件セクションが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-09

**GIVEN** admin ロールのユーザーが営業ダッシュボードを表示しており、updatedAt が 20 日前の negotiation フェーズの案件が存在する
**WHEN** ダッシュボードを確認する
**THEN** 停滞案件セクションが表示され、当該案件が含まれる

---

### TC-022: staleDeals が null の場合に停滞案件セクションが描画されない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** member ロールのユーザーが営業ダッシュボードを表示している（SalesDashboard に staleDeals=null が渡される）
**WHEN** ダッシュボードを確認する
**THEN** 停滞案件セクションが DOM に存在しない

---

## Section 6: 組織レベル請求クエリ

### TC-023: status フィルタを指定すると一致する請求のみ返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Organization-level invoice query > Scenario: Fetch invoices by organization with status filter

---

### TC-024: paidAt 日付範囲フィルタを指定すると範囲内の請求のみ返される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Organization-level invoice query > Scenario: Fetch invoices with paidAt date range filter

---

### TC-025: findAllByOrganization は呼び出し組織の請求のみ返す（テナント分離）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Organization-level invoice query > Scenario: Tenant isolation in findAllByOrganization

---

### TC-026: フィルタなしで呼び出すと組織の全請求が dueDate 昇順で返される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** org-1 に dueDate の異なる請求が 3 件存在する
**WHEN** `findAllByOrganization("org-1")` をフィルタなしで呼び出す
**THEN** 3 件すべてが返され、dueDate 昇順に並んでいる

---

### TC-027: issueDate 範囲フィルタを指定すると範囲内の請求のみ返される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** org-1 に issueDate が 6/1, 7/10, 8/5 の scheduled 請求が存在する
**WHEN** `findAllByOrganization("org-1", { issueDateFrom: 6/1, issueDateTo: 7/31 23:59:59 })` を呼び出す
**THEN** 6/1 と 7/10 の 2 件のみ返される

---

### TC-028: listInvoicesByOrganization が usecase barrel export からインポート可能

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `src/application/usecases/index.ts` が存在する
**WHEN** `import { listInvoicesByOrganization } from "@/application/usecases"` を実行する
**THEN** TypeScript コンパイルエラーが発生せず、関数として呼び出し可能

---

## Section 7: 経理ダッシュボード

### TC-029: 期日超過の請求が dueDate 昇順で表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Finance dashboard overdue invoices > Scenario: Overdue invoices displayed

---

### TC-030: 未入金の請求が dueDate 昇順で表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Finance dashboard unpaid invoices > Scenario: Unpaid invoices displayed

---

### TC-031: 今月の売上サマリが当月入金済み請求の合計金額を表示する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Finance dashboard monthly revenue summary > Scenario: Monthly revenue calculation

---

### TC-032: 請求予定に今月〜翌月末日までの scheduled 請求のみ表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Finance dashboard upcoming invoices > Scenario: Upcoming invoices within two-month window

---

### TC-033: calcMonthlyRevenue に空配列を渡すと 0 を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `calcMonthlyRevenue` に空配列 `[]` を渡す
**WHEN** 関数を実行する
**THEN** 戻り値は `0` である

---

### TC-034: calcMonthlyRevenue が請求配列の amount を正しく合計する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `calcMonthlyRevenue` に amount が 100,000 と 200,000 の Invoice 2 件を渡す
**WHEN** 関数を実行する
**THEN** 戻り値は `300000` である

---

### TC-035: 今月の売上サマリが日本円フォーマット（¥xxx,xxx）で表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** finance ロールのユーザーが経理ダッシュボードを表示しており、monthlyRevenue=300000 が渡されている
**WHEN** 今月の売上サマリセクションを確認する
**THEN** 金額が「¥300,000」形式（`toLocaleString("ja-JP")` 相当）で表示される

---

### TC-036: 各セクションにデータが存在しない場合に空状態メッセージが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** finance ロールのユーザーが経理ダッシュボードを表示しており、overdueInvoices=[], unpaidInvoices=[], upcomingInvoices=[] が渡されている
**WHEN** ダッシュボードを確認する
**THEN** 各セクションでエラーが発生せず、適切な空状態メッセージが表示される

---

## Section 8: ビルド・品質

### TC-037: typecheck && test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12

**GIVEN** 全タスクの実装が完了している
**WHEN** `bun run typecheck && bun test` を実行する
**THEN** 型エラー・テスト失敗ともに 0 件でコマンドが正常終了する

---

### TC-038: dashboardService の純粋関数に単体テストが存在する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-12

**GIVEN** `src/domain/services/__tests__/dashboardService.test.ts` が存在する
**WHEN** テストファイルを確認する
**THEN** `buildActionableItems`, `filterStaleDeals`, `buildPipelineSummary`, `calcMonthlyRevenue` のそれぞれについてテストケースが記述されている

---

## Result

```yaml
result: completed
total: 38
automated: 19
manual: 19
must: 18
should: 18
could: 2
blocked_reasons: []
```
