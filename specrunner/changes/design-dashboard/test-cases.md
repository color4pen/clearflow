# Test Cases: ダッシュボード画面のデザイン適用

## Summary

- **Total**: 31 cases
- **Automated** (unit/integration): 25
- **Manual**: 6
- **Priority**: must: 16, should: 15, could: 0

---

## Scenario 由来テストケース

### TC-001: 全フェーズに案件がある場合の合計表示

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: パイプラインサマリは 6 カラムグリッドで合計列を含む > Scenario: 全フェーズに案件がある場合の合計表示

---

### TC-002: パイプラインセルクリックでフェーズフィルタ遷移

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: パイプラインサマリは 6 カラムグリッドで合計列を含む > Scenario: パイプラインセルクリックでフェーズフィルタ遷移

---

### TC-003: 合計セルクリックで全案件一覧遷移

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: パイプラインサマリは 6 カラムグリッドで合計列を含む > Scenario: 合計セルクリックで全案件一覧遷移

---

### TC-004: 承認リクエストの期日が過去日

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: アクション待ちリストの超過アイテムは赤文字とラベルで強調する > Scenario: 承認リクエストの期日が過去日

---

### TC-005: アクションアイテムの期日が未来日

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: アクション待ちリストの超過アイテムは赤文字とラベルで強調する > Scenario: アクションアイテムの期日が未来日

---

### TC-006: ヘッダーに超過件数バッジ

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: アクション待ちリストの超過アイテムは赤文字とラベルで強調する > Scenario: ヘッダーに超過件数バッジ

---

### TC-007: 全フィールドが揃った停滞案件

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 停滞案件はフェーズ・金額・担当者をドット区切りで表示する > Scenario: 全フィールドが揃った停滞案件

---

### TC-008: 担当者が未設定の停滞案件

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 停滞案件はフェーズ・金額・担当者をドット区切りで表示する > Scenario: 担当者が未設定の停滞案件

---

### TC-009: 30 分前の活動

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 直近の活動は相対時間で表示する > Scenario: 30 分前の活動

---

### TC-010: 3 日前の活動

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 直近の活動は相対時間で表示する > Scenario: 3 日前の活動

---

### TC-011: KPI 値の表示

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 経理ダッシュボードは KPI カードグリッドを表示する > Scenario: KPI 値の表示

---

### TC-012: パイプラインサマリの金額表示

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 金額と日付はモノスペースフォントで表示する > Scenario: パイプラインサマリの金額表示

---

### TC-013: 期日超過テーブルの金額と日付

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 金額と日付はモノスペースフォントで表示する > Scenario: 期日超過テーブルの金額と日付

---

## 非 Scenario 由来テストケース

### TC-014: formatRelativeTime — たった今

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `formatRelativeTime` に現在から 30 秒前の Date を渡す
**WHEN** 関数を実行する
**THEN** 「たった今」が返る

---

### TC-015: formatRelativeTime — ○時間前

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `formatRelativeTime` に現在から 3 時間前の Date を渡す
**WHEN** 関数を実行する
**THEN** 「3時間前」が返る

---

### TC-016: パイプライン合計列のフロントエンド算出

**Category**: unit
**Priority**: must
**Source**: design.md > D3

**GIVEN** `pipelineSummary` が `[{count: 2, totalAmount: 1000000}, {count: 3, totalAmount: 2000000}, {count: 1, totalAmount: 500000}, {count: 4, totalAmount: 5000000}, {count: 1, totalAmount: 300000}]` の 5 要素配列である
**WHEN** `reduce` で count と totalAmount をそれぞれ合計する
**THEN** count の合計が 11、totalAmount の合計が 8,800,000 になる

---

### TC-017: 停滞日数の算出

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `deal.updatedAt` が現在から 10 日前の Date である
**WHEN** `Math.floor((Date.now() - deal.updatedAt.getTime()) / 86400000)` を計算する
**THEN** 10 が返る

---

### TC-018: 超過日数の算出

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `inv.dueDate` が現在から 5 日前の Date である
**WHEN** `Math.floor((Date.now() - inv.dueDate.getTime()) / 86400000)` を計算する
**THEN** 5 が返る

---

### TC-019: estimatedAmount が null の場合の金額省略

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `deal.estimatedAmount` が null、`deal.phase` が `negotiation`、`deal.assigneeName` が「田中太郎」である
**WHEN** 停滞案件のサブテキスト文字列を構築する
**THEN** 出力に「¥」が含まれず、「交渉中 · 田中太郎」の形式になる

---

### TC-020: DashboardHeader — title / subtitle / actions のレンダリング

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `DashboardHeader` に `title="ダッシュボード"`, `subtitle="2026/06/25 | 営業"`, `actions=<button>テストボタン</button>` を渡す
**WHEN** コンポーネントをレンダリングする
**THEN** 「ダッシュボード」テキスト・「2026/06/25 | 営業」テキスト・「テストボタン」ボタンがそれぞれ DOM に存在する

---

### TC-021: SalesDashboard — PageToolbar が表示されない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** SalesDashboard に必要なデータを渡してレンダリングする
**WHEN** コンポーネントツリーを確認する
**THEN** `PageToolbar` コンポーネントが DOM に存在せず、`DashboardHeader` が存在する

---

### TC-022: SalesDashboard — ヘッダーアクションボタンのリンク先

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** SalesDashboard がレンダリングされている
**WHEN** 「案件を見る」リンクと「引合を登録」リンクの href 属性を確認する
**THEN** 「案件を見る」の href が `/deals`、「引合を登録」の href が `/inquiries/new` である

---

### TC-023: SalesDashboard — 2 カラムメインコンテンツレイアウト

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** SalesDashboard をブラウザで表示する
**WHEN** パイプラインサマリ以下のレイアウトを目視確認する
**THEN** アクション待ちリスト（左）と停滞案件＋直近の活動（右）が横並びの 2 カラムで表示され、左カラムが右カラムより明らかに広い（約 1.55:1 の幅比率）

---

### TC-024: SalesDashboard — staleDeals が null の場合の右カラム表示

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** `staleDeals` が null（非 manager/admin ユーザー）の状態で SalesDashboard をレンダリングする
**WHEN** コンポーネントの DOM を確認する
**THEN** 停滞案件セクションが DOM に存在せず、直近の活動セクションのみが右カラムに表示される

---

### TC-025: SalesDashboard — アクション待ちタイプラベルの色分け

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** SalesDashboard をブラウザで表示し、`approval` / `action_item` / `inquiry` の各タイプのアイテムがアクション待ちリストに存在する
**WHEN** 各行のタイプラベルを目視確認する
**THEN** 「承認待ち」が warning 色（黄系）、「アクション」が primary 色（青系）、「新規引合」が success 色（緑系）でそれぞれ 62px 幅のラベルとして表示される

---

### TC-026: SalesDashboard — アクション待ち件名リンクの遷移先

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** アクション待ちリストに `approval` タイプのアイテムが 1 件ある
**WHEN** 件名 Link の href 属性を確認する
**THEN** 該当エンティティの詳細画面 URL（例: `/approvals/{id}`）が href に設定されている

---

### TC-027: FinanceDashboard — PageToolbar が表示されない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** FinanceDashboard に必要なデータを渡してレンダリングする
**WHEN** コンポーネントツリーを確認する
**THEN** `PageToolbar` が DOM に存在せず、`DashboardHeader` が存在する

---

### TC-028: FinanceDashboard — 「契約を見る」ボタンのリンク先

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** FinanceDashboard がレンダリングされている
**WHEN** 「契約を見る」リンクの href 属性を確認する
**THEN** href が `/contracts` である

---

### TC-029: FinanceDashboard — 期日超過テーブルの契約リンク

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** 期日超過リストに `contractId="abc-123"` の Invoice がある状態で FinanceDashboard をレンダリングする
**WHEN** 期日超過テーブルの契約セルを確認する
**THEN** `/contracts/abc-123` への Link が DOM に存在する

---

### TC-030: FinanceDashboard — 下部 2 カラムレイアウト

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** FinanceDashboard をブラウザで表示する
**WHEN** 期日超過テーブル以下のレイアウトを目視確認する
**THEN** 「未入金の請求」（左）と「請求予定」（右）が横並びの 2 カラムで表示され、各行が flex レイアウト（件名左・金額と期日右）になっている

---

### TC-031: typecheck && 既存テスト が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `change/design-dashboard-9c7a810e` ブランチで全タスク（T-01〜T-10）が実装済みである
**WHEN** `typecheck && test` を実行する
**THEN** 型エラーが 0 件、既存テストが全件 pass する

---

## Result

```yaml
result: completed
total: 31
automated: 25
manual: 6
must: 16
should: 15
could: 0
blocked_reasons: []
```
