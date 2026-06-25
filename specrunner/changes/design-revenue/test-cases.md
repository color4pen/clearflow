# Test Cases: 売上画面のデザイン適用

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 2
- **Manual**: 23
- **Priority**: must: 16, should: 7, could: 2

---

## A: ダッシュボード KPI

### TC-001: 3 カラム KPI カードが正しく表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ダッシュボードに 3 カラム KPI カードを表示する > Scenario: 3 カラム KPI カードが正しく表示される

---

### TC-002: 今月の売上が緑系テキストで表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** 売上ダッシュボードページにアクセスしている
**WHEN** ページがレンダリングされる
**THEN** 1 列目の KPI カード「今月の売上」の金額テキストに `text-success` クラス相当の緑系スタイルが適用されている

---

### TC-003: 確定見込みカードの金額が正しく表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** 売上ダッシュボードページにアクセスしている
**WHEN** ページがレンダリングされる
**THEN** 2 列目に「確定見込み」ラベルと `¥{n.toLocaleString("ja-JP")}` 形式の金額が表示される
**AND** カード下部に「契約・請求予定の金額」の補足テキストが `text-xs text-text-muted` スタイルで表示される

---

### TC-004: パイプラインカードのフェーズ別内訳が維持される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** 売上ダッシュボードページにアクセスしている
**WHEN** ページがレンダリングされる
**THEN** 3 列目の KPI カードにパイプラインのフェーズ別内訳が従来どおり表示される

---

### TC-025: getRevenueDashboard が confirmedRevenue フィールドを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** 有効な organizationId と当月の startDate / endDate を引数に `getRevenueDashboard` ユースケースを呼び出す
**WHEN** 関数が実行される
**THEN** 戻り値に `confirmedRevenue: number` フィールドが含まれる
**AND** `confirmedRevenue` の値は当月の `status IN ('scheduled', 'invoiced')` の請求合計金額である
**AND** 既存フィールド（`currentMonthRevenue`, `monthlyTrend`, `pipelineSummary`, `topCustomers`）が引き続き正しく返る

---

## B: ダッシュボード 月次推移

### TC-005: 月次推移に金額比例の CSS バーが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 月次推移セクションに視覚的バーを表示する > Scenario: 月次推移にバーが表示される

---

### TC-006: 月行クリックで明細に月フィルタ付きで遷移する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 月次推移の月クリックで明細に遷移する > Scenario: 月行クリックで明細に遷移する

---

## C: ダッシュボード 顧客ランキング

### TC-007: 顧客行クリックで顧客詳細に遷移する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 顧客別ランキングの行クリックで顧客詳細に遷移する > Scenario: 顧客行クリックで顧客詳細に遷移する

---

### TC-008: 顧客行ホバーで cursor-pointer と背景色変化が表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-04

**GIVEN** 顧客別ランキングテーブルが表示されている
**WHEN** テーブルの任意の行にマウスオーバーする
**THEN** カーソルが `pointer` に変わり、行の背景色がホバー状態に変化する

---

## D: 売上明細 フィルタ/タブ

### TC-009: 集計軸タブが 3 つ表示されアクティブタブが強調される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 売上明細の集計軸をタブ UI で切り替える > Scenario: 集計軸タブが表示される

---

### TC-010: タブ切替で集計軸 searchParam とテーブルカラムが変わる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 売上明細の集計軸をタブ UI で切り替える > Scenario: タブ切替で集計軸が変わる

---

### TC-011: 期間フィルタが引き続き動作する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 売上明細ページにアクセスしている
**WHEN** 開始日と終了日を入力して検索フォームを送信する
**THEN** URL に `startDate` / `endDate` searchParam が反映される
**AND** テーブルに指定期間内のデータが表示される

---

### TC-012: CSV エクスポートボタンが存在する

**Category**: manual
**Priority**: must
**Source**: request.md > 受け入れ基準 / tasks.md > T-05

**GIVEN** 売上明細ページにアクセスしている
**WHEN** ページがレンダリングされる
**THEN** CSV エクスポートボタン（またはリンク）が表示される
**AND** タブ切替後も CSV エクスポートボタンが引き続き表示される

---

## E: 売上明細 テーブルナビ

### TC-013: 顧客別テーブルの行クリックで /clients/{clientId} に遷移する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** 売上明細ページで集計軸「顧客別」タブがアクティブになっている
**WHEN** テーブルの任意の行をクリックする
**THEN** `/clients/{行の clientId}` に遷移する

---

### TC-014: 案件別テーブルの行クリックで /deals/{dealId} に遷移する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** 売上明細ページで集計軸「案件別」タブがアクティブになっている
**WHEN** テーブルの任意の行をクリックする
**THEN** `/deals/{行の dealId}` に遷移する

---

### TC-015: 月別テーブルは行クリック遷移が発生しない

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-06

**GIVEN** 売上明細ページで集計軸「月別」タブがアクティブになっている
**WHEN** テーブルの任意の行をクリックする
**THEN** ナビゲーションは発生せず、行が `cursor-pointer` スタイルになっていない

---

## F: 予実管理 期間選択

### TC-016: 期間種別切替で表示期間が変わる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 予実管理に期間種別セレクタを表示する > Scenario: 期間種別切替で表示期間が変わる

---

### TC-017: デフォルトは年次（既存互換）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** 予実管理ページに `periodType` searchParam なしでアクセスする
**WHEN** ページがレンダリングされる
**THEN** 「年次」タブがアクティブ状態で強調表示される
**AND** 表示期間が当年 1/1〜12/31 として算出される

---

### TC-018: 前後ナビゲーションで期間を移動できる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 予実管理ページで「月次」が選択されており、当月が表示されている
**WHEN** 「前へ（<）」ボタンをクリックする
**THEN** 表示期間が前月の 1 日〜末日に切り替わる
**AND** 「次へ（>）」ボタンをクリックすると元の月に戻る

---

## G: 予実管理 目標編集

### TC-019: 権限のあるユーザーが目標金額をインライン編集できる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存目標の金額をインライン編集できる > Scenario: 目標金額のインライン編集

---

### TC-020: 権限のないユーザーには目標金額が読み取り専用で表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 売上目標設定権限（`revenue:setTarget`）のないユーザーが予実管理ページを表示している
**WHEN** ページがレンダリングされる
**THEN** 目標金額が `<p>` テキストとして読み取り専用で表示される
**AND** `MoneyInput` フォームおよび保存ボタンは表示されない

---

## H: 予実管理 プログレスバー

### TC-021: プログレスバーが 2 色で着地予測を表示する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: プログレスバーにパイプライン着地予測を表示する > Scenario: プログレスバーが 2 色で着地予測を表示する

---

### TC-022: 着地予測が目標超過の場合バーは 100% で止まる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 目標金額 ¥10,000,000 の目標がある
**AND** 実績が ¥8,000,000（80%）、パイプライン見込みが ¥4,000,000（合計 120%）
**WHEN** 予実管理ページがレンダリングされる
**THEN** プログレスバーの実績セグメントと見込みセグメントの幅の合計が 100% を超えない

---

### TC-023: 着地予測の金額が数値でも表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09

**GIVEN** 予実管理ページがレンダリングされている
**WHEN** 目標カードを確認する
**THEN** 着地予測金額が `¥{n.toLocaleString("ja-JP")}` 形式で数値テキストとして表示される

---

## I: ビルド/型チェック

### TC-024: typecheck && test が green

**Category**: integration
**Priority**: must
**Source**: request.md > 受け入れ基準

**GIVEN** 本変更の実装が完了している
**WHEN** `bun run typecheck && bun run test` を実行する
**THEN** 型エラーなし・テスト失敗なしで終了する（exit code 0）

---

## Result

```yaml
result: completed
total: 25
automated: 2
manual: 23
must: 16
should: 7
could: 2
blocked_reasons: []
```
