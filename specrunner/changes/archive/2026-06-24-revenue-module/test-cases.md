# Test Cases: 売上モジュールの実装

## Summary

- **Total**: 38 cases
- **Automated** (unit/integration): 30
- **Manual**: 8
- **Priority**: must: 28, should: 9, could: 1

---

## revenueRepository — 集計クエリ

### TC-001: 過去 12 ヶ月の月次売上集計

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Monthly revenue aggregation SHALL sum paid invoice amounts by paidAt month > Scenario: Monthly revenue for the past 12 months

---

### TC-002: 対象期間に入金済み請求がない月

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Monthly revenue aggregation SHALL sum paid invoice amounts by paidAt month > Scenario: Month with no paid invoices

---

### TC-003: 顧客別売上 上位 10 社

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Customer revenue aggregation SHALL group paid invoices by client > Scenario: Top 10 customers by revenue

---

### TC-004: 期間指定での案件別売上集計

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Deal revenue aggregation SHALL group paid invoices by deal > Scenario: Deal-based aggregation within a period

---

### TC-005: パイプライン集計で won / lost フェーズを除外する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Pipeline aggregation SHALL sum estimatedAmount for non-terminal deal phases > Scenario: Pipeline summary excludes won and lost deals

---

### TC-006: estimatedAmount が null の案件は件数に含まれ金額は 0 として集計される

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: Pipeline aggregation SHALL sum estimatedAmount for non-terminal deal phases > Scenario: Deal with null estimatedAmount is counted but contributes 0 to sum

---

### TC-007: status = "paid" かつ paidAt NOT NULL の請求のみが売上集計に含まれる

**Category**: integration
**Priority**: must
**Source**: design.md > D8, tasks.md > T-04

**GIVEN** 同一期間に `status = "paid"` / `paidAt` あり、`status = "pending"` / `paidAt` なし の請求が混在する
**WHEN** `getMonthlyRevenue` を呼び出す
**THEN** `status = "paid"` かつ `paidAt IS NOT NULL` の請求の金額のみが集計に含まれ、他は除外される

---

### TC-008: revenueRepository の集計クエリは organizationId でテナント分離される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** 2 つの異なる組織にそれぞれ入金済み請求が存在する
**WHEN** 一方の `organizationId` で `getMonthlyRevenue` を呼び出す
**THEN** 呼び出し組織の請求のみが集計結果に含まれ、他組織の請求は含まれない

---

### TC-009: getMonthlyRevenue の yearMonth フィールドが YYYY-MM 形式で返される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** 2026 年 1 月に入金済み請求が存在する
**WHEN** その月を含む範囲で `getMonthlyRevenue` を呼び出す
**THEN** 結果に `yearMonth: "2026-01"` のエントリが含まれる

---

## revenueTargetRepository — CRUD

### TC-010: 売上目標の作成

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: revenue_targets table SHALL store period-based target amounts per organization > Scenario: Create a revenue target

---

### TC-011: 期間が重複する売上目標の作成を拒否する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: revenue_targets table SHALL store period-based target amounts per organization > Scenario: Reject overlapping target period

---

### TC-012: findOverlapping が部分的な期間の重複を検出する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** 2026-07-01 〜 2026-07-31 の目標が存在する
**WHEN** `findOverlapping(orgId, 2026-07-15, 2026-08-15)` を呼び出す
**THEN** 既存目標が結果に含まれる（重複あり）

---

### TC-013: findByPeriod が指定日を含む目標を返す

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** 2026-07-01 〜 2026-07-31 の目標が存在する
**WHEN** `findByPeriod(orgId, 2026-07-15)` を呼び出す
**THEN** 該当目標が返される

---

## 認可マトリクス (authorization.ts)

### TC-014: finance ロールは目標設定不可（売上閲覧は可能）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Revenue target operations SHALL enforce role-based access control > Scenario: Finance user can view but not set targets

---

### TC-015: finance ロールは CSV エクスポート可能

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Revenue target operations SHALL enforce role-based access control > Scenario: Finance user can export CSV

---

### TC-016: 全ロールが revenue.view を実行できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `member`, `finance`, `manager`, `admin` の各ロール
**WHEN** `canPerform(role, "revenue", "view")` を呼び出す
**THEN** 全ロールで `true` が返される

---

### TC-017: admin と manager のみが revenue.setTarget を実行できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** 各ロール（admin, manager, finance, member）
**WHEN** `canPerform(role, "revenue", "setTarget")` を呼び出す
**THEN** `admin` → `true`、`manager` → `true`、`finance` → `false`、`member` → `false`

---

### TC-018: member は revenue.export を実行できない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `member` ロールのユーザー
**WHEN** `canPerform("member", "revenue", "export")` を呼び出す
**THEN** `false` が返される

---

## 予実管理ユースケース

### TC-019: setRevenueTarget が targetAmount <= 0 でバリデーションエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** 有効な期間（periodStart < periodEnd）が指定されている
**WHEN** `targetAmount = 0` または負の値で `setRevenueTarget` を呼び出す
**THEN** `{ ok: false, reason: ... }` が返され、目標は作成されない

---

### TC-020: setRevenueTarget が periodStart >= periodEnd でバリデーションエラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** 有効な `targetAmount` が指定されている
**WHEN** `periodStart >= periodEnd` の条件で `setRevenueTarget` を呼び出す
**THEN** `{ ok: false, reason: ... }` が返され、目標は作成されない

---

### TC-021: updateRevenueTarget が存在しない ID に対してエラーを返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 組織内に存在しない目標 ID
**WHEN** `updateRevenueTarget({ id: "<non-existent>", organizationId, targetAmount: 100 })` を呼び出す
**THEN** not found エラーが返される

---

### TC-022: getRevenueForecast が進捗率と着地予測を正しく算出する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** 目標 1,000 万円、実績 600 万円、パイプライン見込み合計 300 万円が存在する
**WHEN** 対象期間で `getRevenueForecast` を呼び出す
**THEN** 進捗率 = 60%、着地予測 = 900 万円 が返される

---

## Server Actions (revenue.ts)

### TC-023: setRevenueTargetAction — 未認証ユーザーはエラーが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 有効なセッションがない状態
**WHEN** `setRevenueTargetAction` を呼び出す
**THEN** 認証エラーが返され、目標は作成されない

---

### TC-024: setRevenueTargetAction — member ロールは認可エラーが返る

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `member` ロールで認証済みのユーザー
**WHEN** `setRevenueTargetAction` を呼び出す
**THEN** 認可エラーが返され、目標は作成されない

---

## 売上ダッシュボードページ (/revenue)

### TC-025: 認証済みユーザーが /revenue にアクセスするとダッシュボードが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Revenue dashboard page SHALL display current month total, monthly trend, pipeline forecast, and top customers > Scenario: Authenticated user views revenue dashboard

---

## 売上明細ページ (/revenue/details)

### TC-026: 期間と月別軸を指定すると月次集計テーブルが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Revenue details page SHALL support period filtering and aggregation axis switching > Scenario: Filter by period and monthly axis

---

### TC-027: 集計軸を顧客別に切り替えると顧客別テーブルが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Revenue details page SHALL support period filtering and aggregation axis switching > Scenario: Switch to customer axis

---

## CSV エクスポート API (/api/revenue/export)

### TC-028: 月次軸で CSV エクスポートが成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: CSV export endpoint SHALL return revenue details as a downloadable CSV file > Scenario: Export monthly revenue as CSV

---

### TC-029: 未認証リクエストは 401 を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: CSV export endpoint SHALL return revenue details as a downloadable CSV file > Scenario: Unauthenticated request is rejected

---

### TC-030: member ロールのリクエストは 403 を返す

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-11

**GIVEN** `member` ロールで認証済みのユーザー
**WHEN** `GET /api/revenue/export?startDate=2026-01-01&endDate=2026-06-30&axis=monthly` をリクエストする
**THEN** 403 レスポンスが返される

---

### TC-031: CSV レスポンスに UTF-8 BOM が含まれる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-11, design.md > D7

**GIVEN** `admin` ロールで認証済みのユーザー
**WHEN** `/api/revenue/export` をリクエストする
**THEN** レスポンスボディの先頭が UTF-8 BOM（`\xEF\xBB\xBF`）で始まる

---

### TC-032: CSV の各フィールドに CSV インジェクション対策が適用される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-11, design.md > D7

**GIVEN** `=SUM(A1:A10)` で始まる顧客名が存在する
**WHEN** 顧客軸で `/api/revenue/export` をリクエストする
**THEN** 該当フィールドが `'=SUM(A1:A10)` のようにプレフィックス `'` でエスケープされている

---

## 予実管理ページ (/revenue/forecast)

### TC-033: admin ユーザーが目標を設定すると保存と進捗表示が正常に動作する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Forecast page SHALL allow setting target amounts and display progress > Scenario: Admin sets a monthly target

---

### TC-034: member ユーザーには目標設定フォームが表示されない（閲覧のみ）

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Forecast page SHALL allow setting target amounts and display progress > Scenario: Member user cannot set targets

---

## ナビゲーション

### TC-035: ダッシュボードのナビゲーションに「売上」リンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Navigation SHALL include a "revenue" link > Scenario: Revenue link appears in navigation

---

### TC-036: 「売上」リンクが「契約」と「申請一覧」の間に配置されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-13

**GIVEN** 認証済みユーザーがダッシュボードを表示している
**WHEN** ナビゲーションバーを確認する
**THEN** 「売上」リンクが「契約」リンクの直後（「申請一覧」リンクの前）に配置されている

---

## ラベル定義

### TC-037: aggregationAxisLabels が labels.ts に定義されている

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/labels.ts` をインポートする
**WHEN** `aggregationAxisLabels` を参照する
**THEN** `{ monthly: "月別", customer: "顧客別", deal: "案件別" }` が定義されている

---

## ビルド検証

### TC-038: typecheck && test が green で完了する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-15

**GIVEN** 実装が完了した状態
**WHEN** `bun run typecheck && bun run test` を実行する
**THEN** 型エラーなし、全テスト pass で exit 0 となる

---

## Result

```yaml
result: completed
total: 38
automated: 30
manual: 8
must: 28
should: 9
could: 1
blocked_reasons: []
```
