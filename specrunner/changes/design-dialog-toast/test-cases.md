# Test Cases: ダイアログ・トーストのデザイン統一

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

- **Total**: 31 cases
- **Automated** (unit/integration): 19
- **Manual**: 12
- **Priority**: must: 23, should: 8, could: 0

---

## ConfirmDialog コンポーネント

### TC-001: ダイアログが開いている状態

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog の表示制御 > Scenario: ダイアログが開いている状態

### TC-002: ダイアログが閉じている状態

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog の表示制御 > Scenario: ダイアログが閉じている状態

### TC-003: danger バリアントの確認ボタン

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog のバリアント > Scenario: danger バリアントの確認ボタン

### TC-004: primary バリアント（デフォルト）の確認ボタン

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog のバリアント > Scenario: primary バリアント（デフォルト）の確認ボタン

### TC-005: 日付入力フィールドを含むダイアログ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog の children スロット > Scenario: 日付入力フィールドを含むダイアログ

### TC-006: 非同期操作中のダイアログ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ConfirmDialog のローディング状態 > Scenario: 非同期操作中のダイアログ

### TC-007: ConfirmDialog のキャンセルボタンが outline スタイルである

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01: ConfirmDialog コンポーネントの作成

**GIVEN** ConfirmDialog が open=true でレンダリングされている

**WHEN** キャンセルボタンを視覚的に確認する

**THEN** キャンセルボタンは `border border-border` を持つ outline スタイルでレンダリングされており、塗りつぶし背景はない

### TC-008: components/index.ts に ConfirmDialog がエクスポートされている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01: ConfirmDialog コンポーネントの作成

**GIVEN** `src/app/components/index.ts` が存在する

**WHEN** ファイルの export リストを確認する

**THEN** `ConfirmDialog` が named export として含まれている

---

## Toast システム

### TC-009: 成功トーストの表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Toast の表示位置とスタイル > Scenario: 成功トーストの表示

### TC-010: エラートーストの表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Toast の表示位置とスタイル > Scenario: エラートーストの表示

### TC-011: トーストが時間経過で消える

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Toast の自動消去 > Scenario: トーストが時間経過で消える

### TC-012: コンポーネントからトーストを発行する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Toast の Context アクセス > Scenario: コンポーネントからトーストを発行する

### TC-013: 連続トースト発行時の挙動

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Toast のトースト置換 > Scenario: 連続トースト発行時の挙動

### TC-014: useToast が ToastProvider 外で呼ばれたときエラーをスロー

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02: Toast システムの作成（Context + Provider + コンポーネント + Hook）

**GIVEN** ToastProvider でラップされていないコンポーネントツリーがある

**WHEN** そのコンポーネント内で `useToast()` を呼び出す

**THEN** 「Provider 外で useToast が呼ばれた」旨のエラーがスローされる

### TC-015: components/index.ts に ToastProvider と useToast がエクスポートされている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-02: Toast システムの作成（Context + Provider + コンポーネント + Hook）

**GIVEN** `src/app/components/index.ts` が存在する

**WHEN** ファイルの export リストを確認する

**THEN** `ToastProvider` と `useToast` が named export として含まれている

---

## ToastProvider の統合

### TC-016: ダッシュボードレイアウトが server component のまま維持されている

**Category**: manual
**Priority**: should
**Source**: design.md > D3: ToastProvider はダッシュボードレイアウトに配置する / tasks.md > T-03

**GIVEN** `src/app/(dashboard)/layout.tsx` が存在する

**WHEN** ファイル先頭の `"use client"` ディレクティブの有無を確認する

**THEN** `"use client"` ディレクティブがなく、クライアント処理は `DashboardProviders.tsx` に委譲されている

### TC-017: ダッシュボード内の任意のページから useToast() が使用可能

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03: ToastProvider をダッシュボードレイアウトに統合する

**GIVEN** ダッシュボード配下のページコンポーネント（例: DeleteContractButton）が ToastProvider の子孫として配置されている

**WHEN** そのコンポーネントが `useToast()` を呼び出す

**THEN** エラーなく `showToast` 関数を取得でき、呼び出すとトーストが表示される

---

## window.confirm の ConfirmDialog 置換

### TC-018: 削除ボタンでの確認ダイアログ表示

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: window.confirm の ConfirmDialog 置換 > Scenario: 削除ボタンでの確認ダイアログ表示

### TC-019: プロジェクト内に window.confirm の呼び出しが 0 件

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04: window.confirm() を ConfirmDialog に置換する

**GIVEN** プロジェクトのソースコード（`src/` 配下）全体

**WHEN** `window\.confirm` の使用箇所を静的に検索する

**THEN** 1 件もヒットしない

### TC-020: DealHeaderActions の受注確認ダイアログが primary バリアント

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: window.confirm() を ConfirmDialog に置換する

**GIVEN** 案件詳細画面（受注可能なステータス）が表示されている

**WHEN** ユーザーが「受注」ボタンをクリックする

**THEN** `variant="primary"` の ConfirmDialog が表示され、`window.confirm` は呼ばれない

### TC-021: DealHeaderActions の失注確認ダイアログが danger バリアント

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: window.confirm() を ConfirmDialog に置換する

**GIVEN** 案件詳細画面（失注可能なステータス）が表示されている

**WHEN** ユーザーが「失注」ボタンをクリックする

**THEN** `variant="danger"` の ConfirmDialog が表示され、`window.confirm` は呼ばれない

### TC-022: ClientContactsSection の担当者削除が danger バリアントの ConfirmDialog を使う

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04: window.confirm() を ConfirmDialog に置換する

**GIVEN** クライアント詳細画面の担当者セクションに担当者が一覧表示されている

**WHEN** ユーザーが担当者の削除アイコンをクリックする

**THEN** `variant="danger"` の ConfirmDialog が表示され、確認ボタン押下で削除が実行され、キャンセルボタン押下でダイアログが閉じて削除は実行されない

---

## 既存インラインモーダルの ConfirmDialog 統一

### TC-023: InquiryActions のインラインモーダルが ConfirmDialog に置換されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05: 既存インラインモーダルを ConfirmDialog に統一する

**GIVEN** 引き合い詳細画面が表示されている

**WHEN** ユーザーが「案件化」ボタンをクリックする

**THEN** 手書きのインラインモーダル HTML ではなく ConfirmDialog（variant="primary", title="案件化"）が表示される

### TC-024: InvoiceActions の入金確認ダイアログに日付入力フィールドが含まれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05: 既存インラインモーダルを ConfirmDialog に統一する

**GIVEN** 請求書詳細画面が表示されている

**WHEN** ユーザーが入金確認ボタンをクリックする

**THEN** ConfirmDialog の children スロットに日付入力フィールドが表示され、手書きのインラインモーダルは存在しない

### TC-025: ContractStatusActions 契約完了確認が primary バリアント

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05: 既存インラインモーダルを ConfirmDialog に統一する

**GIVEN** 契約詳細画面（契約中ステータス）が表示されている

**WHEN** ユーザーが「完了」ボタンをクリックする

**THEN** ConfirmDialog（variant="primary", title="契約完了", message="この契約を完了しますか？"）が表示される

### TC-026: ContractStatusActions 契約解除確認が danger バリアント

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05: 既存インラインモーダルを ConfirmDialog に統一する

**GIVEN** 契約詳細画面（契約中ステータス）が表示されている

**WHEN** ユーザーが「解除」ボタンをクリックする

**THEN** ConfirmDialog（variant="danger", title="契約解除", message="この契約を解除しますか？"）が表示される

---

## アクション結果のトースト移行

### TC-027: アクション成功後にサクセストーストが表示される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06: アクション結果メッセージをトーストに移行する

**GIVEN** 削除確認ダイアログが表示されており、削除 API が成功するよう設定されている

**WHEN** ユーザーが確認ボタンをクリックする

**THEN** サクセストースト（緑左ボーダー）が表示され、インライン成功メッセージは表示されない

### TC-028: アクションエラー時にエラートーストが表示される

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06: アクション結果メッセージをトーストに移行する

**GIVEN** 削除確認ダイアログが表示されており、削除 API がエラーを返すよう設定されている

**WHEN** ユーザーが確認ボタンをクリックする

**THEN** エラートースト（赤左ボーダー）が表示され、インラインエラー表示 JSX は存在しない

### TC-029: 削除成功後 router.push 前にトーストが発行される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06: アクション結果メッセージをトーストに移行する / design.md > D3

**GIVEN** 削除確認ダイアログで確認済みの状態で、削除 API が成功する

**WHEN** 削除処理が完了し router.push が実行される

**THEN** `showToast` が `router.push` より前に呼ばれており、遷移後の画面でもトーストが表示される

### TC-030: フォームバリデーションエラーはインライン表示を維持する

**Category**: manual
**Priority**: should
**Source**: design.md > D4: エラーメッセージのトースト移行はボタン操作アクションに限定する

**GIVEN** 新規案件作成フォーム（NewDealForm）が表示されている

**WHEN** 必須フィールドを空のままフォームを送信する

**THEN** バリデーションエラーがフィールド近接のインライン表示で表示され、トーストは表示されない

---

## ビルド品質

### TC-031: typecheck && test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06 Acceptance Criteria / request.md 受け入れ基準

**GIVEN** すべてのタスク（T-01〜T-06）の実装が完了している

**WHEN** `bun run typecheck && bun run test` を実行する

**THEN** 型エラー・テスト失敗がゼロで正常終了する

---

## Result

```yaml
result: completed
total: 31
automated: 19
manual: 12
must: 23
should: 8
could: 0
blocked_reasons: []
```
