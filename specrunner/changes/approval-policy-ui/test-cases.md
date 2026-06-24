# Test Cases: 承認ポリシー設定画面

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

- **Total**: 43 cases
- **Automated** (unit/integration): 10
- **Manual**: 33
- **Priority**: must: 36, should: 6, could: 1

---

## Category: アクセス制御 — 一覧ページ

### TC-001: admin ユーザーがポリシー一覧を閲覧する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー一覧ページは認可された管理者とマネージャーのみがアクセスできる > Scenario: admin ユーザーがポリシー一覧を閲覧する

---

### TC-002: manager ユーザーがポリシー一覧を閲覧する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー一覧ページは認可された管理者とマネージャーのみがアクセスできる > Scenario: manager ユーザーがポリシー一覧を閲覧する

---

### TC-003: member ユーザーがポリシー一覧ページへのアクセスを拒否される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー一覧ページは認可された管理者とマネージャーのみがアクセスできる > Scenario: member ユーザーがアクセスを拒否される

---

### TC-004: finance ユーザーがポリシー一覧ページへのアクセスを拒否される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー一覧ページは認可された管理者とマネージャーのみがアクセスできる > Scenario: finance ユーザーがアクセスを拒否される

---

### TC-005: テナント分離 — 他組織のポリシーが一覧に表示されない

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05 / spec.md > Requirement: ポリシー一覧ページは認可された管理者とマネージャーのみがアクセスできる

**GIVEN** 組織 A に admin ユーザー、組織 B にポリシーが存在する
**WHEN** 組織 A の admin ユーザーが `/settings/policies` にアクセスする
**THEN** 組織 B のポリシーは一覧に表示されず、組織 A のポリシーのみが表示される

---

## Category: アクセス制御 — 作成ページ

### TC-006: manager が作成ページへのアクセスを拒否される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: admin ユーザーのみがポリシーを作成できる > Scenario: manager が作成ページにアクセスを拒否される

---

### TC-007: member が作成ページへのアクセスを拒否される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** member ロールのユーザーがログインしている
**WHEN** `/settings/policies/new` に直接アクセスする
**THEN** `/requests` にリダイレクトされる

---

## Category: アクセス制御 — 編集ページ

### TC-008: admin 以外のロールが編集ページへのアクセスを拒否される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** manager ロールのユーザーがログインしている
**WHEN** `/settings/policies/[id]/edit` に直接アクセスする
**THEN** `/requests` にリダイレクトされる

---

## Category: アクセス制御 — サーバーアクション

### TC-009: listPoliciesAction が admin/manager で成功し member/finance で認可エラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `listPoliciesAction` を admin, manager, member, finance の各ロールで呼び出す
**WHEN** 各ロールでアクションを実行する
**THEN** admin/manager は `{ success: true, policies: [...] }` を返す。member/finance は `{ success: false, message: "..." }` を返す

---

### TC-010: createPolicyAction が admin 以外で認可エラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** manager ロールのセッションで `createPolicyAction` を呼び出す
**WHEN** 有効なフォームデータを渡す
**THEN** `{ success: false, message: "..." }` が返り、リポジトリの create は呼ばれない

---

### TC-011: updatePolicyAction が admin 以外で認可エラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** manager ロールのセッションで `updatePolicyAction` を呼び出す
**WHEN** 有効なフォームデータを渡す
**THEN** `{ success: false, message: "..." }` が返り、リポジトリの updateById は呼ばれない

---

### TC-012: togglePolicyAction が admin 以外で認可エラーを返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** manager ロールのセッションで `togglePolicyAction(policyId)` を呼び出す
**WHEN** 存在するポリシー ID を渡す
**THEN** `{ success: false, message: "..." }` が返り、リポジトリの updateById は呼ばれない

---

## Category: 一覧表示 — トリガーアクションラベル

### TC-013: inquiry.convert が日本語ラベルで表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー一覧はトリガーアクションを日本語ラベルで表示する > Scenario: inquiry.convert が日本語ラベルで表示される

---

### TC-014: 未定義のトリガーアクションはそのまま表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: ポリシー一覧はトリガーアクションを日本語ラベルで表示する > Scenario: 未定義のトリガーアクションはそのまま表示される

---

### TC-015: contract.create と contract.cancel が日本語ラベルで表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `triggerAction` が `contract.create` のポリシーと `contract.cancel` のポリシーが存在する
**WHEN** ポリシー一覧を表示する
**THEN** それぞれのトリガーアクション列に「契約の作成」「契約の解除」と表示される

---

## Category: 一覧表示 — 条件表示

### TC-016: 条件付きポリシーの条件表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー一覧は条件の有無を適切に表示する > Scenario: 条件付きポリシーの条件表示

---

### TC-017: 無条件ポリシーの条件表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー一覧は条件の有無を適切に表示する > Scenario: 無条件ポリシーの条件表示

---

## Category: 一覧表示 — テンプレート名・状態・件数

### TC-018: テンプレート名が一覧に表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** テンプレートに紐付いたポリシーが存在する
**WHEN** admin ユーザーがポリシー一覧を表示する
**THEN** テンプレート列にテンプレート名が表示される（テンプレートが見つからない場合は ID が表示される）

---

### TC-019: isActive の状態がバッジで表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** isActive=true のポリシーと isActive=false のポリシーが存在する
**WHEN** ポリシー一覧を表示する
**THEN** isActive=true のポリシーは緑色で「有効」、isActive=false のポリシーはグレーで「無効」と表示される

---

### TC-020: ポリシーが0件のとき空状態メッセージが表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** 組織にポリシーが一件も存在しない
**WHEN** admin ユーザーが `/settings/policies` にアクセスする
**THEN** テーブルの代わりに「登録済みポリシーはありません。」というメッセージが表示される

---

### TC-021: 一覧フッターにポリシー件数が表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-05

**GIVEN** 組織にポリシーが複数存在する
**WHEN** ポリシー一覧を表示する
**THEN** 一覧のフッターにポリシーの件数が表示される

---

## Category: 一覧表示 — UI 要素の表示制御

### TC-022: manager にはトグルボタン・作成リンク・編集リンクが非表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: admin ユーザーのみがポリシーの有効/無効を切り替えられる > Scenario: manager にはトグルボタンが表示されない

---

### TC-023: admin には作成リンク・編集リンク・トグルボタンが表示される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** admin ロールのユーザーがログインしている
**WHEN** ポリシー一覧を表示する
**THEN** ツールバーに「ポリシーを追加」リンクが表示され、各行に編集リンクとトグルボタンが表示される

---

## Category: PolicyForm — 条件入力連動

### TC-024: 条件フィールドが空のとき演算子・値が disabled

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 条件フィールドの入力状態に応じて演算子・値の入力が連動する > Scenario: 条件フィールドが空のとき演算子・値が disabled

---

### TC-025: 条件フィールド入力時に演算子・値が enabled かつ required

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 条件フィールドの入力状態に応じて演算子・値の入力が連動する > Scenario: 条件フィールド入力時に演算子・値が enabled かつ required

---

## Category: PolicyForm — バリデーション

### TC-026: 必須項目が未入力の場合エラーが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー作成・編集フォームのバリデーション > Scenario: 必須項目が未入力の場合エラーが返される

---

### TC-027: 条件フィールド入力時に演算子・値が未入力の場合エラーが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ポリシー作成・編集フォームのバリデーション > Scenario: 条件フィールド入力時に演算子・値が未入力の場合エラーが返される

---

### TC-028: conditionField が空のとき conditionOperator と conditionValue が null でリポジトリに渡される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `createPolicyAction` が呼び出され、フォームデータの conditionField が空文字
**WHEN** zod バリデーションを通過する
**THEN** リポジトリに渡す引数の conditionOperator と conditionValue が null（または undefined）になる

---

## Category: ポリシー作成フロー

### TC-029: admin がポリシーを作成する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: admin ユーザーのみがポリシーを作成できる > Scenario: admin がポリシーを作成する

---

### TC-030: 作成モードでフォームが空の初期状態で表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** admin ロールのユーザーがログインしている
**WHEN** `/settings/policies/new` にアクセスする
**THEN** PolicyForm の全フィールドが空（または未選択）の状態で表示される

---

## Category: ポリシー編集フロー

### TC-031: admin がポリシーを編集する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: admin ユーザーのみがポリシーを編集できる > Scenario: admin がポリシーを編集する

---

### TC-032: 存在しないポリシー ID で 404 が返される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: admin ユーザーのみがポリシーを編集できる > Scenario: 存在しないポリシー ID で 404 が返される

---

### TC-033: 編集モードで既存値がフォームに事前入力される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** admin ロールのユーザーがログインしている、かつポリシーが存在する
**WHEN** `/settings/policies/[id]/edit` にアクセスする
**THEN** PolicyForm の各フィールドにポリシーの現在値（name, description, triggerAction, conditionField, conditionOperator, conditionValue, templateId）が反映されている

---

## Category: 有効/無効トグル

### TC-034: admin が有効なポリシーを無効にする

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: admin ユーザーのみがポリシーの有効/無効を切り替えられる > Scenario: admin が有効なポリシーを無効にする

---

### TC-035: admin が無効なポリシーを有効にする

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03 / T-05

**GIVEN** admin ロールのユーザーがログインしている、かつ isActive=false のポリシーが存在する
**WHEN** 一覧のトグルボタンをクリックする
**THEN** ポリシーの isActive が true に更新され、一覧に「有効」と表示される

---

## Category: SettingsNav

### TC-036: 設定画面に承認ポリシーリンクが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: SettingsNav に承認ポリシーリンクが表示される > Scenario: 設定画面にポリシーリンクが表示される

---

### TC-037: SettingsNav の変更が他のリンクの表示・動作に影響しない

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** ユーザーが設定画面にアクセスしている
**WHEN** SettingsNav を表示する
**THEN** Webhook、テンプレート、ユーザー、代理承認、監査ログのリンクが引き続き正しい順序で表示され、それぞれのリンクが正常に機能する

---

## Category: ヘルパー関数 (constants.ts)

### TC-038: getTriggerActionLabel がマッピング済み値を日本語ラベルに変換する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `getTriggerActionLabel` 関数が `constants.ts` に定義されている
**WHEN** `"inquiry.convert"`, `"contract.create"`, `"contract.cancel"` をそれぞれ渡す
**THEN** 順に `"引合の案件化"`, `"契約の作成"`, `"契約の解除"` を返す

---

### TC-039: getTriggerActionLabel が未定義の値をそのまま返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `getTriggerActionLabel` 関数が `constants.ts` に定義されている
**WHEN** マッピングに存在しない `"unknown.action"` を渡す
**THEN** `"unknown.action"` をそのまま返す

---

### TC-040: formatCondition が conditionField null のとき "常に" を返す

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `formatCondition` 関数が `constants.ts` に定義されている
**WHEN** `formatCondition(null, null, null)` を呼び出す
**THEN** `"常に"` を返す

---

### TC-041: formatCondition が条件を "{field} {operatorLabel} {value}" 形式に整形する

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `formatCondition` 関数が `constants.ts` に定義されている
**WHEN** `formatCondition("amount", "gte", "100000")` を呼び出す
**THEN** `"amount ≥ 100000"` を返す

---

## Category: ビルド・型チェック・テスト

### TC-042: typecheck が型エラーなしで完了する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 実装が完了している
**WHEN** `bun run typecheck` を実行する
**THEN** 型エラーが0件で exit 0 で完了する

---

### TC-043: bun test が全件 pass する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** 実装が完了している
**WHEN** `bun test` を実行する
**THEN** 既存テストを含む全テストケースが pass し、失敗が0件である

---

## Result

```yaml
result: completed
total: 43
automated: 10
manual: 33
must: 36
should: 6
could: 1
blocked_reasons: []
```
