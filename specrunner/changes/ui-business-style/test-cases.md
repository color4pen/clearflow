# Test Cases: UIを業務システムスタイルにリデザイン

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

- **Total**: 38 cases
- **Automated** (unit/integration): 7
- **Manual**: 31
- **Priority**: must: 27, should: 10, could: 1

---

## ヘッダー

### TC-001: ヘッダーの外観

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ダッシュボードヘッダーは36px以下の高さで濃紺背景である > Scenario: ヘッダーの外観

### TC-002: ナビゲーションリンクの表示（admin）

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ダッシュボードヘッダーは36px以下の高さで濃紺背景である > Scenario: ナビゲーションリンクの表示（admin）

### TC-003: ナビゲーションリンクの表示（member）

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ダッシュボードヘッダーは36px以下の高さで濃紺背景である > Scenario: ナビゲーションリンクの表示（member）

### TC-004: ユーザー名・ロール・ログアウトが右端に配置される

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-03

**GIVEN** ダッシュボードレイアウトが描画される  
**WHEN** ヘッダーの右端エリアを確認する  
**THEN** ユーザー名とロールが `text-slate-300 text-xs` で1行に表示され、ログアウトボタンが `text-slate-400 hover:text-white text-xs` スタイルで右端に配置されている

### TC-005: main 要素のパディングが py-4 に変更されている

- **Category**: manual
- **Priority**: could
- **Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/layout.tsx` のソースコードを確認する  
**WHEN** `<main>` 要素の padding クラスを確認する  
**THEN** `py-8` ではなく `py-4` が使われている

---

## ステータス表示

### TC-006: 一覧テーブルのステータス表示

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ステータス表示はバッジスタイルを使わず色テキストのみで表現する > Scenario: 一覧テーブルのステータス表示

### TC-007: 詳細画面のステータス表示

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ステータス表示はバッジスタイルを使わず色テキストのみで表現する > Scenario: 詳細画面のステータス表示

### TC-008: 各ステータスの色クラスが正しくマッピングされている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-02

**GIVEN** `src/app/(dashboard)/requests/statusUtils.ts` の `statusClass` 関数を対象とする  
**WHEN** `draft` / `pending` / `approved` / `rejected` / `revision` / `expired` の各ステータスを渡す  
**THEN** それぞれ `"text-gray-500 font-medium"` / `"text-amber-700 font-bold"` / `"text-emerald-700 font-medium"` / `"text-red-700 font-medium"` / `"text-orange-600 font-bold"` / `"text-gray-400 font-medium"` が返る

### TC-009: 承認ステップのステータス表示に rounded-full が使われていない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` の承認ステップ表示部分を確認する  
**WHEN** `stepStatusClass` が適用されたステータス要素のクラスを確認する  
**THEN** `rounded-full` が使われておらず、色テキストのみで表示されている

---

## statusUtils.ts

### TC-010: 重複コードの解消

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: statusLabel と statusClass は statusUtils.ts に一元定義される > Scenario: 重複コードの解消

### TC-011: statusRowClass が正しいクラスを返す

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-02

**GIVEN** `src/app/(dashboard)/requests/statusUtils.ts` の `statusRowClass` 関数を対象とする  
**WHEN** `pending` / `revision` / `approved` の各ステータスを渡す  
**THEN** それぞれ `"bg-amber-50"` / `"bg-orange-50"` / `""` が返る

### TC-012: stepStatusLabel / stepStatusClass がエクスポートされている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-02

**GIVEN** `src/app/(dashboard)/requests/statusUtils.ts` を確認する  
**WHEN** エクスポートされた関数一覧を確認する  
**THEN** `stepStatusLabel` と `stepStatusClass` が存在し、`ApprovalStepStatus` を引数として受け付ける

### TC-013: 両ページが statusUtils.ts からインポートしている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-02

**GIVEN** `requests/page.tsx` と `requests/[id]/page.tsx` を確認する  
**WHEN** 各ファイルのインポート文とファイル内定義を確認する  
**THEN** `statusUtils.ts` からのインポート文が存在し、どちらのファイルにも `statusLabel` / `statusClass` の関数定義が存在しない

---

## 申請一覧テーブル

### TC-014: テーブル行の高密度化

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 申請一覧テーブルは高密度レイアウトで承認進捗列と期限列を含む > Scenario: テーブル行の高密度化

### TC-015: 承認待ち行の背景色

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 申請一覧テーブルは高密度レイアウトで承認進捗列と期限列を含む > Scenario: 承認待ち行の背景色

### TC-016: 承認進捗列の表示

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 申請一覧テーブルは高密度レイアウトで承認進捗列と期限列を含む > Scenario: 承認進捗列の表示

### TC-017: 期限の強調表示

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 申請一覧テーブルは高密度レイアウトで承認進捗列と期限列を含む > Scenario: 期限の強調表示

### TC-018: 差し戻し行の背景色が bg-orange-50

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-05

**GIVEN** status が `revision` の申請が一覧に存在する  
**WHEN** その行を確認する  
**THEN** 行の背景色に `bg-orange-50` が適用されている

### TC-019: テーブルヘッダーのスタイル

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-05

**GIVEN** 申請一覧テーブルが表示される  
**WHEN** テーブルヘッダー行（`<thead>`）のスタイルを確認する  
**THEN** `bg-slate-50 text-xs text-slate-500 font-medium uppercase` が適用されている

### TC-020: アクションがインラインテキストリンク形式

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-05

**GIVEN** 申請一覧テーブルに承認可能な申請が存在する  
**WHEN** アクション列を確認する  
**THEN** 承認・却下のアクションがボタン形式ではなく `text-blue-600 text-xs underline` のインラインテキストリンクとして表示されている

### TC-021: RequestWithSteps 型に承認ステップ情報が含まれる

- **Category**: unit
- **Priority**: must
- **Source**: tasks.md > T-04

**GIVEN** `src/domain/models/request.ts` を確認する  
**WHEN** `RequestWithSteps` 型の定義を確認する  
**THEN** `approvalSteps` 配列（各要素に `approverRole: string`, `status: "pending" | "approved" | "rejected"`, `deadline: Date | null` を持つ `ApprovalStepSummary[]`）が型に含まれる

### TC-022: listRequests が RequestWithSteps[] を返す

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-04

**GIVEN** テスト用の organization に複数の申請と承認ステップが存在する  
**WHEN** `listRequests` usecase を呼び出す  
**THEN** 各 request に `approvalSteps` 配列が含まれた `RequestWithSteps[]` が返り、N+1 クエリが発生しない（単一 JOIN クエリで取得される）

---

## 設定ナビゲーション

### TC-023: active タブの視覚的区別

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 設定タブに active 状態スタイルが適用される > Scenario: active タブの視覚的区別

### TC-024: 代理承認リンクの存在

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: 設定ナビゲーションに代理承認リンクが含まれる > Scenario: 代理承認リンクの存在

### TC-025: SettingsNav.tsx が "use client" ディレクティブを持つ

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/settings/SettingsNav.tsx` を確認する  
**WHEN** ファイル先頭の宣言を確認する  
**THEN** `"use client"` ディレクティブがファイル先頭に存在する

### TC-026: settings/layout.tsx が Server Component のまま

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/settings/layout.tsx` を確認する  
**WHEN** ファイル先頭の宣言を確認する  
**THEN** `"use client"` ディレクティブが存在せず Server Component として実装されており、認証チェック（`auth()`）が維持されている

### TC-027: 非 active タブのスタイル

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-07

**GIVEN** `/settings/templates` ページを表示している  
**WHEN** 「テンプレート」以外の設定タブを確認する  
**THEN** 非 active タブに `text-gray-500 hover:text-gray-700` が適用されている

---

## フッター統計

### TC-028: フッター統計の表示

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: フッター統計が一覧テーブル下に表示される > Scenario: フッター統計の表示

### TC-029: フッターのスタイルが text-xs text-slate-400

- **Category**: manual
- **Priority**: should
- **Source**: tasks.md > T-05

**GIVEN** 申請一覧テーブル下のフッター統計要素を確認する  
**WHEN** フッター要素の className を確認する  
**THEN** `text-xs text-slate-400` が適用されている

---

## スタイル定数

### TC-030: ボタンスタイルの定数参照

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ボタン・inputのスタイルが styles.ts の定数を参照する > Scenario: ボタンスタイルの定数参照

### TC-031: styles.ts の定数定義

- **Category**: manual
- **Priority**: must
- **Source**: spec.md > Requirement: ボタン・inputのスタイルが styles.ts の定数を参照する > Scenario: styles.ts の定数定義

### TC-032: BTN_PRIMARY_DISABLED が定義されている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-01

**GIVEN** `src/app/(dashboard)/styles.ts` を確認する  
**WHEN** エクスポートされた定数を確認する  
**THEN** `BTN_PRIMARY_DISABLED` が定義されており `disabled:opacity-50 disabled:cursor-not-allowed` を含む

### TC-033: SELECT_BASE が定義されている

- **Category**: unit
- **Priority**: should
- **Source**: tasks.md > T-01

**GIVEN** `src/app/(dashboard)/styles.ts` を確認する  
**WHEN** エクスポートされた定数を確認する  
**THEN** `SELECT_BASE` が定義されており `block w-full border border-gray-300 rounded-md` を含む

### TC-034: T-08 対象ファイルがスタイル定数を参照している

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-08

**GIVEN** T-08 の対象ファイル群（`ActionButtons.tsx`、`BulkApprovalPanel.tsx`、`settings/templates/page.tsx`、`TemplateForm.tsx`、`WebhookCreateForm.tsx`、`audit-logs/page.tsx`、`delegations/page.tsx`、`UserRoleSelect.tsx`）を確認する  
**WHEN** 各ファイルのボタン・input の `className` を確認する  
**THEN** `styles.ts` から定数をインポートして参照しており、Tailwind クラスの直接ハードコードが存在しない（`disabled:opacity-50` 等の追加修飾子は `` `${BTN_PRIMARY} disabled:opacity-50` `` 形式での追記は許容）

---

## ビルド・品質

### TC-035: bun run build が成功する

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09

**GIVEN** 全変更が実装された状態  
**WHEN** `bun run build` を実行する  
**THEN** エラーなくビルドが完了する

### TC-036: bun test が全件 green

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09

**GIVEN** 全変更が実装された状態  
**WHEN** `bun test` を実行する  
**THEN** 全テストケースがパスし、0 failures

### TC-037: typecheck が green

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09

**GIVEN** 全変更が実装された状態  
**WHEN** `bun run lint`（typecheck 含む）を実行する  
**THEN** TypeScript の型エラーが 0 件である

### TC-038: ステータス表示に rounded-full が使われていない（grep 確認）

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)` 配下の全ファイルを対象とする  
**WHEN** `rounded-full` の使用箇所を grep で確認する  
**THEN** ステータス表示に関連する箇所に `rounded-full` が使われていない

---

## Result

```yaml
result: completed
total: 38
automated: 7
manual: 31
must: 27
should: 10
could: 1
blocked_reasons: []
```
