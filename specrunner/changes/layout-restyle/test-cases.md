# Test Cases: layout-restyle

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

- **Total**: 22 cases
- **Automated** (unit/integration): 19
- **Manual**: 3
- **Priority**: must: 17, should: 4, could: 1

---

## 案件詳細 / ヒーローヘッダー

### TC-001: 受注フェーズの案件を表示するとグリーンバッジが表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細のヒーロー行にフェーズバッジを表示する > Scenario: 受注フェーズの案件を表示する

---

### TC-002: ヒアリングフェーズの案件を表示するとグレーバッジが表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 案件詳細のヒーロー行にフェーズバッジを表示する > Scenario: ヒアリングフェーズの案件を表示する

---

### TC-003: WatchToggle がヒーロー行の右端に配置され、ステッパーカード内に存在しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: WatchToggle がヒーロー行の右端に配置される > Scenario: 案件詳細ページを表示する

---

### TC-004: estimateRequestId が存在するとヒーロー行に見積承認リンクが表示される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 見積承認リンクが estimateRequestId 存在時のみヒーロー行に表示される > Scenario: estimateRequestId が存在する案件

---

### TC-005: estimateRequestId が存在しないとヒーロー行に見積承認リンクが表示されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 見積承認リンクが estimateRequestId 存在時のみヒーロー行に表示される > Scenario: estimateRequestId が存在しない案件

---

### TC-006: PHASE_VARIANT 全フェーズのバリアントマッピングが正しい

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `deals/[id]/page.tsx` に定義された `PHASE_VARIANT` 定数
**WHEN** 各フェーズキー（proposal_prep / proposed / negotiation / lost / passed）を参照する
**THEN** proposal_prep=blue / proposed=blue / negotiation=blue / lost=red / passed=gray が返される

---

### TC-007: phaseVariant が未知フェーズに対して gray を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `deals/[id]/page.tsx` の `phaseVariant` ヘルパー関数
**WHEN** `PHASE_VARIANT` に存在しないフェーズ文字列を渡す
**THEN** `"gray"` を返す

---

### TC-008: タイトル要素が div ではなく h1 タグを使用している

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `deals/[id]/page.tsx` のソースファイル
**WHEN** タイトル要素のタグを確認する
**THEN** `<h1 className="text-lg font-bold` が存在し、`<div className="text-lg font-bold` は存在しない

---

### TC-009: ステッパー SectionCard の直接の子が DealPhaseStepper のみになっている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `deals/[id]/page.tsx` のソースファイル
**WHEN** ステッパー `SectionCard` 内の要素を確認する
**THEN** `WatchToggle` がステッパー `SectionCard` 内に存在せず、`DealPhaseStepper` が直接配置されている

---

### TC-010: 見積承認リンクの href と文言が変わっていない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `deals/[id]/page.tsx` のソースファイル
**WHEN** 見積承認リンクのソースを確認する
**THEN** `href={`/requests/${deal.estimateRequestId}`}` に相当するパターンと文言「見積承認を表示」が存在する

---

### TC-011: deals/[id]/page.tsx に hex 直書きクラスが存在しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: src/app/(dashboard) 配下に生パレット・hex を持ち込まない > Scenario: 変更後のファイルを静的検査する

**GIVEN** T-01〜T-02 の変更が適用された `deals/[id]/page.tsx`
**WHEN** `text-[#` / `bg-[#` / `border-[#` パターンをファイル内で検索する
**THEN** マッチが 0 件である

---

## ダッシュボード / KPI グリッド

### TC-012: パイプラインサマリに複数フェーズが存在すると個別カードが描画される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ダッシュボードの KPI が指標ごとの独立カードで描画される > Scenario: パイプラインサマリに複数フェーズが存在する

---

### TC-013: SalesDashboard.tsx に grid-cols-8 が存在しない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** T-03 の変更が適用された `SalesDashboard.tsx`
**WHEN** ファイル内容を検索する
**THEN** `grid-cols-8` が存在しない

---

### TC-014: SalesDashboard.tsx に auto-fill と minmax(150px が存在する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** T-03 の変更が適用された `SalesDashboard.tsx`
**WHEN** ファイル内容を検索する
**THEN** `auto-fill` および `minmax(150px` がいずれも存在する

---

### TC-015: KPI 値スタイルが text-2xl font-bold になっている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** T-03 の変更が適用された `SalesDashboard.tsx`
**WHEN** KPI 値要素のクラスを確認する
**THEN** `text-2xl font-bold` が存在し、旧スタイル `text-xl font-bold` は KPI 値に使われていない

---

## ダッシュボード / h2 色統一

### TC-016: SalesDashboard.tsx の h2 に text-text-muted が残っていない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** T-04 の変更が適用された `SalesDashboard.tsx`
**WHEN** h2 要素のクラスパターンを検索する
**THEN** `text-sm font-semibold text-text-muted` が存在しない

---

### TC-017: h2 の文言が不変である

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** T-04 の変更が適用された `SalesDashboard.tsx`
**WHEN** ファイル内容を確認する
**THEN** 「アクション待ちリスト」「停滞案件リスト」「直近の活動」の各文字列が存在する

---

### TC-018: SalesDashboard.tsx に hex 直書きクラスが存在しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: src/app/(dashboard) 配下に生パレット・hex を持ち込まない > Scenario: 変更後のファイルを静的検査する

**GIVEN** T-03〜T-04 の変更が適用された `SalesDashboard.tsx`
**WHEN** `text-[#` / `bg-[#` / `border-[#` パターンをファイル内で検索する
**THEN** マッチが 0 件である

---

## 品質ゲート

### TC-019: 既存テストが全て green のまま

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** T-01〜T-06 の変更が適用されたリポジトリ
**WHEN** `bun test` を実行する
**THEN** 全テストが exit 0 で完了し、既存の挙動アサーション（Server Action・遷移テスト等）のいずれも失敗しない

---

### TC-020: typecheck / lint / build が全て green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** T-01〜T-06 の変更が適用されたリポジトリ
**WHEN** `bun run typecheck && bun run lint && bun run build` を順に実行する
**THEN** 全コマンドが exit 0 で完了する

---

### TC-021: aozu check が exit 0 で architecture test が green

**Category**: manual
**Priority**: should
**Source**: request.md > 受け入れ基準

**GIVEN** T-01〜T-06 の変更が適用されたリポジトリ
**WHEN** `aozu check` を実行する
**THEN** exit 0 で完了し、architecture test が失敗しない

---

### TC-022: ダークテーマでヒーロー行・KPI カードのコントラストが成立する

**Category**: manual
**Priority**: should
**Source**: request.md > 実装上の必須事項 3

**GIVEN** `[data-theme="dark"]` が有効なブラウザ環境
**WHEN** 案件詳細ページとダッシュボードを目視確認する
**THEN** ヒーロー行のタイトル・フェーズバッジ・操作群、および KPI カードの各テキスト要素が背景に対して十分なコントラストを持つ（デザイントークン参照のみで生パレット・hex の持ち込みなし）

---

### TC-023: PHASE_VARIANT 定数に deals/page.tsx との同期コメントが存在する

**Category**: integration
**Priority**: could
**Source**: design.md > D1: PHASE_VARIANT マッピングを deals/[id]/page.tsx に複製する

**GIVEN** `deals/[id]/page.tsx` のソースファイル
**WHEN** `PHASE_VARIANT` 定数定義付近を確認する
**THEN** `deals/page.tsx` との同期が必要な旨を示すコードコメントが存在する

---

## Result

```yaml
result: completed
total: 22
automated: 19
manual: 3
must: 17
should: 4
could: 1
blocked_reasons: []
```
