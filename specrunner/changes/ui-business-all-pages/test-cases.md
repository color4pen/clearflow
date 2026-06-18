# Test Cases: 業務システムUIを全ページに展開

## Summary

- **Total**: 82 cases
- **Automated** (unit/integration): 8
- **Manual**: 74
- **Priority**: must: 60, should: 15, could: 7

---

## styles.ts 定数

### TC-001: BTN_PRIMARY がテキストリンクスタイルを返す

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: styles.ts の定数はすべて業務システムスタイルを返す > Scenario: BTN_PRIMARY がテキストリンクスタイルを返す

### TC-002: INPUT_BASE が業務システムスタイルを返す

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: styles.ts の定数はすべて業務システムスタイルを返す > Scenario: INPUT_BASE が業務システムスタイルを返す

### TC-003: BTN_DANGER がテキストリンクスタイルを返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** styles.ts が import されている  
**WHEN** `BTN_DANGER` を参照する  
**THEN** 文字列に `text-[#c0392b]` と `underline` が含まれ、`bg-red-600` や `rounded-md` が含まれない

### TC-004: BTN_SUBMIT が export され塗りボタンスタイルを持つ

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** styles.ts が import されている  
**WHEN** `BTN_SUBMIT` を参照する  
**THEN** 文字列に `bg-[#2980b9]`、`text-white`、`rounded-none` が含まれ、`rounded-md` や `shadow` が含まれない

### TC-005: SELECT_BASE が rounded-none かつ shadow なしのスタイルを返す

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** styles.ts が import されている  
**WHEN** `SELECT_BASE` を参照する  
**THEN** 文字列に `rounded-none` と `border-[#cccccc]` が含まれ、`shadow-sm` や `rounded-md` が含まれない

### TC-006: TOOLBAR 定数が export されている

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-01

**GIVEN** styles.ts が import されている  
**WHEN** `TOOLBAR` を参照する  
**THEN** 文字列に `bg-[#f5f5f5]` と `border border-[#cccccc]` が含まれる

### TC-007: SECTION_CARD 定数が export されている

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-01

**GIVEN** styles.ts が import されている  
**WHEN** `SECTION_CARD` を参照する  
**THEN** 文字列に `bg-white` と `border border-[#e0e0e0]` が含まれる

### TC-008: styles.ts に旧スタイルクラスが含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-01

**GIVEN** `src/app/(dashboard)/styles.ts` を参照する  
**WHEN** `rounded-md`, `rounded-lg`, `shadow-sm`, `shadow`, `bg-blue-600`, `bg-red-600`, `bg-green-600`, `bg-orange-500` を grep する  
**THEN** いずれも 0 件ヒットする

---

## 旧スタイル除去（静的検証）

### TC-009: rounded-md が src/app/ 配下に存在しない

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 全ページから旧スタイルクラスが除去されている > Scenario: rounded-md が全ファイルに存在しない

### TC-010: bg-blue-600 が src/app/ 配下に存在しない

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 全ページから旧スタイルクラスが除去されている > Scenario: bg-blue-600 が全ファイルに存在しない

### TC-011: rounded-lg が src/app/ 配下に存在しない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** すべてのファイル変更が完了している  
**WHEN** `src/app/` 配下の `.tsx` ファイルで `rounded-lg` を grep する  
**THEN** 0 件ヒットする

### TC-012: shadow-sm が src/app/ 配下に存在しない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** すべてのファイル変更が完了している  
**WHEN** `src/app/` 配下の `.tsx` ファイルで `shadow-sm` を grep する  
**THEN** 0 件ヒットする

### TC-013: shadow-md が src/app/ 配下に存在しない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** すべてのファイル変更が完了している  
**WHEN** `src/app/` 配下の `.tsx` ファイルで `shadow-md` を grep する  
**THEN** 0 件ヒットする

### TC-014: font-mono が src/app/ 配下に存在しない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** すべてのファイル変更が完了している  
**WHEN** `src/app/` 配下の `.tsx` ファイルで `font-mono` を grep する  
**THEN** 0 件ヒットする

---

## ログインページ

### TC-015: ログインボタンが塗りボタンである

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: フォーム送信ボタンは最小限の塗りボタンスタイルを使用する > Scenario: ログインボタンが塗りボタンである

### TC-016: ログインページの外側背景が bg-[#e8e8e8]

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-02

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを確認する  
**WHEN** 外側コンテナのクラスを参照する  
**THEN** `bg-[#e8e8e8]` が含まれ、`bg-gray-50` が含まれない

### TC-017: ログインカードに shadow/rounded-lg が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-02

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを確認する  
**WHEN** カード要素のクラスを参照する  
**THEN** `shadow`, `shadow-md`, `rounded-lg` が含まれず、`bg-white border border-[#e0e0e0]` が含まれる

### TC-018: ログインフォームの入力フィールドが rounded-none で shadow なし

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-02

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを確認する  
**WHEN** input 要素のクラスを参照する  
**THEN** `rounded-none` が含まれ、`rounded-md`, `shadow-sm`, `focus:ring-2` が含まれない

### TC-019: ログインページのエラーメッセージに rounded が含まれない

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-02

**GIVEN** `src/app/(auth)/login/page.tsx` のソースコードを確認する  
**WHEN** エラーメッセージ要素のクラスを参照する  
**THEN** `rounded` が含まれず、`text-[#c0392b]` と `text-xs` が含まれる

---

## 申請詳細ページ

### TC-020: 申請詳細ページの承認ボタンがテキストリンクである

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: アクション操作はテキストリンク形式で表示される > Scenario: 申請詳細ページの承認ボタンがテキストリンクである

### TC-021: 申請詳細ページのメインカードに shadow/rounded-lg が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを確認する  
**WHEN** メインコンテナのクラスを参照する  
**THEN** `shadow`, `rounded-lg` が含まれず、`bg-white border border-[#e0e0e0]` が含まれる

### TC-022: 承認ステップがテーブル形式で表示される

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを確認する  
**WHEN** ApprovalStepsSection の実装を参照する  
**THEN** `<ol>` / `<li>` ではなく `<table>` / `<thead>` / `<tbody>` 構造で実装されている

### TC-023: 承認ステップテーブルのヘッダーが bg-[#dcdde1] スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを確認する  
**WHEN** ApprovalStepsSection の thead 要素のクラスを参照する  
**THEN** `bg-[#dcdde1]` と `border border-[#bdc3c7]` が含まれ、th に `text-xs text-[#2c3e50] font-bold` が含まれる

### TC-024: 承認ステップテーブルの行が偶数/奇数で色分けされている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを確認する  
**WHEN** tbody の tr 要素の className 振り分けロジックを参照する  
**THEN** index の偶奇で `bg-white` / `bg-[#f9f9f9]` が切り替わる実装になっている

### TC-025: 差し戻しコメント表示に rounded が含まれない

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-03

**GIVEN** `src/app/(dashboard)/requests/[id]/page.tsx` のソースコードを確認する  
**WHEN** 差し戻しコメント要素のクラスを参照する  
**THEN** `rounded` が含まれず、`text-xs text-[#d35400]` が含まれる

---

## ActionButtons（申請詳細アクション）

### TC-026: 却下ボタンがテキストリンク形式

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` のソースコードを確認する  
**WHEN** 却下ボタン要素のクラスを参照する  
**THEN** `text-[#c0392b]` と `underline` が含まれ、`bg-red-600` が含まれない

### TC-027: 差し戻しボタンがテキストリンク形式

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` のソースコードを確認する  
**WHEN** 差し戻しボタン要素のクラスを参照する  
**THEN** `text-[#d35400]` と `underline` が含まれ、`bg-orange-500` が含まれない

### TC-028: 提出ボタンが BTN_SUBMIT スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` のソースコードを確認する  
**WHEN** draft 状態の提出ボタン実装を参照する  
**THEN** `BTN_SUBMIT` 定数が使用されており、`bg-blue-600` が含まれない

### TC-029: 再申請ボタンが BTN_SUBMIT スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` のソースコードを確認する  
**WHEN** revision 状態の再申請ボタン実装を参照する  
**THEN** `BTN_SUBMIT` 定数が使用されており、`bg-blue-600` が含まれない

### TC-030: ActionButtons に bg-blue-600 等の塗りボタンが含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-04

**GIVEN** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` のソースコードを確認する  
**WHEN** `bg-blue-600`, `bg-green-600`, `bg-red-600`, `bg-orange-500` を grep する  
**THEN** いずれも 0 件ヒットする

---

## 申請作成フォーム

### TC-031: 申請作成フォームのページヘッダーがツールバー形式

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/requests/new/page.tsx` のソースコードを確認する  
**WHEN** ページヘッダー要素のクラスを参照する  
**THEN** `bg-[#f5f5f5] border border-[#cccccc] px-2 py-1` が含まれ、`text-2xl font-bold` が含まれない

### TC-032: フォームカードに shadow/rounded-lg が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/requests/new/page.tsx` のソースコードを確認する  
**WHEN** フォームコンテナのクラスを参照する  
**THEN** `shadow`, `rounded-lg`, `rounded-md` が含まれず、`bg-white border border-[#e0e0e0]` が含まれる

### TC-033: 送信ボタンが BTN_SUBMIT スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/requests/new/page.tsx` のソースコードを確認する  
**WHEN** 送信ボタンの実装を参照する  
**THEN** `BTN_SUBMIT` 定数が使用されており、`bg-blue-600` や `rounded-md` が含まれない

### TC-034: キャンセルリンクがテキストリンク形式

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/requests/new/page.tsx` のソースコードを確認する  
**WHEN** キャンセルリンク要素のクラスを参照する  
**THEN** `text-xs text-[#7f8c8d] underline` が含まれ、`border border-gray-300 rounded-md` が含まれない

### TC-035: 申請作成フォームの入力フィールドが rounded-none で shadow なし

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/requests/new/page.tsx` のソースコードを確認する  
**WHEN** input / textarea 要素のクラスを参照する  
**THEN** `rounded-none` が含まれ、`rounded-md`, `shadow-sm`, `focus:ring-2` が含まれない

---

## 設定共通（SettingsNav / layout）

### TC-036: SettingsNav に border-blue-600 が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/settings/SettingsNav.tsx` のソースコードを確認する  
**WHEN** `border-blue-600` を grep する  
**THEN** 0 件ヒットする

### TC-037: SettingsNav のアクティブタブが text-[#2c3e50] font-bold

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/settings/SettingsNav.tsx` のソースコードを確認する  
**WHEN** アクティブタブのクラス実装を参照する  
**THEN** `text-[#2c3e50]` と `font-bold` が含まれ、`text-blue-600` が含まれない

### TC-038: SettingsNav のナビ全体が bg-[#f5f5f5] border border-[#cccccc]

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/settings/SettingsNav.tsx` のソースコードを確認する  
**WHEN** ナビ外側コンテナのクラスを参照する  
**THEN** `bg-[#f5f5f5] border border-[#cccccc]` が含まれ、`border-b border-gray-200` が含まれない

### TC-039: SettingsNav のタブテキストサイズが text-xs

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/settings/SettingsNav.tsx` のソースコードを確認する  
**WHEN** タブリンクのクラスを参照する  
**THEN** `text-xs` が含まれ、`text-sm` が含まれない

---

## テンプレート管理

### TC-040: テンプレート管理テーブルのヘッダーが正しい

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: 全テーブルヘッダーが統一スタイルを持つ > Scenario: テンプレート管理テーブルのヘッダーが正しい

### TC-041: テンプレート一覧テーブルに divide-y が含まれない

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/settings/templates/page.tsx` のソースコードを確認する  
**WHEN** `<tbody>` のクラスを参照する  
**THEN** `divide-y` が含まれない

### TC-042: テンプレート一覧の行が偶数/奇数で色分けされている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/settings/templates/page.tsx` のソースコードを確認する  
**WHEN** `<tr>` の className 実装を参照する  
**THEN** index の偶奇で `bg-white` / `bg-[#f9f9f9]` が切り替わる実装になっている

### TC-043: テンプレート一覧フッターバーが表示される

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/settings/templates/page.tsx` のソースコードを確認する  
**WHEN** テーブル下部の要素クラスを参照する  
**THEN** `bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-0.5 text-xs text-[#7f8c8d]` が含まれる

### TC-044: テンプレート一覧テーブルコンテナに rounded-lg/shadow-sm が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-07

**GIVEN** `src/app/(dashboard)/settings/templates/page.tsx` のソースコードを確認する  
**WHEN** テーブルコンテナのクラスを参照する  
**THEN** `rounded-lg`, `shadow-sm` が含まれず、`bg-white border border-[#e0e0e0]` が含まれる

---

## TemplateForm

### TC-045: TemplateForm の送信ボタンが BTN_SUBMIT

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/settings/templates/TemplateForm.tsx` のソースコードを確認する  
**WHEN** 送信ボタンの実装を参照する  
**THEN** `BTN_SUBMIT` 定数が使用されており、`BTN_PRIMARY` や `bg-blue-600` が使われていない

### TC-046: TemplateForm のステップカードに rounded-md が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/settings/templates/TemplateForm.tsx` のソースコードを確認する  
**WHEN** 承認ステップカード要素のクラスを参照する  
**THEN** `rounded-md` が含まれず、`bg-[#f9f9f9]` と `border border-[#e0e0e0]` が含まれる

### TC-047: TemplateForm のセレクトボックスが rounded-none

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/settings/templates/TemplateForm.tsx` のソースコードを確認する  
**WHEN** ロールセレクト要素のクラスを参照する  
**THEN** `rounded-none` が含まれ、`rounded-md`, `focus:ring-2` が含まれない

---

## DeleteButton

### TC-048: DeleteButton がテキストリンク形式

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-09

**GIVEN** `src/app/(dashboard)/settings/templates/DeleteButton.tsx` のソースコードを確認する  
**WHEN** ボタン要素のクラスを参照する  
**THEN** `text-[#c0392b]` と `underline` が含まれ、`border-red-300`, `rounded`, `hover:bg-red-50` が含まれない

---

## ユーザー管理

### TC-049: ユーザー管理テーブルのヘッダーが bg-[#dcdde1] スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/settings/users/page.tsx` のソースコードを確認する  
**WHEN** `<thead>` のクラスを参照する  
**THEN** `bg-[#dcdde1]` と `border border-[#bdc3c7]` が含まれ、`bg-gray-50`, `uppercase` が含まれない

### TC-050: ユーザー管理テーブルコンテナに rounded-lg/shadow-sm が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/settings/users/page.tsx` のソースコードを確認する  
**WHEN** テーブルコンテナのクラスを参照する  
**THEN** `rounded-lg`, `shadow-sm` が含まれず、`bg-white border border-[#e0e0e0]` が含まれる

### TC-051: ユーザー管理の行が偶数/奇数で色分けされている

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/settings/users/page.tsx` のソースコードを確認する  
**WHEN** `<tr>` の className 実装を参照する  
**THEN** index の偶奇で `bg-white` / `bg-[#f9f9f9]` が切り替わる実装になっている

### TC-052: UserRoleSelect が rounded-none で動作する

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/settings/users/UserRoleSelect.tsx` のソースコードを確認する  
**WHEN** select 要素に適用されているクラスを参照する  
**THEN** `SELECT_BASE` 定数が使用されており（T-01 更新後 rounded-none を含む）、`rounded-md` が含まれない

### TC-053: UserRoleSelect のエラーメッセージが text-[#c0392b]

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/settings/users/UserRoleSelect.tsx` のソースコードを確認する  
**WHEN** エラーメッセージ要素のクラスを参照する  
**THEN** `text-[#c0392b]` が含まれ、`text-red-600` が含まれない

---

## Webhook 管理

### TC-054: Webhook URL 表示が sans-serif

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: font-mono が使用されていない > Scenario: Webhook URL 表示が sans-serif

### TC-055: Webhook 一覧テーブルのヘッダーが bg-[#dcdde1] スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/page.tsx` のソースコードを確認する  
**WHEN** `<thead>` のクラスを参照する  
**THEN** `bg-[#dcdde1]` と `border border-[#bdc3c7]` が含まれ、`bg-gray-50`, `uppercase` が含まれない

### TC-056: Webhook ステータスバッジがテキスト表現

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/page.tsx` のソースコードを確認する  
**WHEN** ステータス表示要素のクラスを参照する  
**THEN** `bg-green-100`, `bg-gray-100`, `rounded` が含まれず、有効時は `text-[#1a8a4a] text-xs font-bold`、無効時は `text-[#95a5a6] text-xs` が使用されている

### TC-057: Webhook 有効化/無効化ボタンがテキストリンク形式

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/page.tsx` のソースコードを確認する  
**WHEN** 有効化/無効化ボタン要素のクラスを参照する  
**THEN** `text-[#2980b9]` と `underline` が含まれ、`border border-gray-300`, `rounded` が含まれない

### TC-058: Webhook 削除ボタンがテキストリンク形式

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/page.tsx` のソースコードを確認する  
**WHEN** 削除ボタン要素のクラスを参照する  
**THEN** `text-[#c0392b]` と `underline` が含まれ、`border-red-300`, `rounded` が含まれない

### TC-059: WebhookCreateForm の font-mono が除去されている

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx` のソースコードを確認する  
**WHEN** `font-mono` を grep する  
**THEN** 0 件ヒットする

### TC-060: WebhookCreateForm の送信ボタンが BTN_SUBMIT

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx` のソースコードを確認する  
**WHEN** 送信ボタンの実装を参照する  
**THEN** `BTN_SUBMIT` 定数が使用されており、`BTN_PRIMARY` や `bg-blue-600` が使われていない

### TC-061: WebhookCreateForm のチェックボックスに rounded が含まれない

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx` のソースコードを確認する  
**WHEN** チェックボックス要素のクラスを参照する  
**THEN** `rounded` が含まれず、`border-[#cccccc]` が含まれる

### TC-062: WebhookCreateForm の成功メッセージに rounded-md が含まれない

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-11

**GIVEN** `src/app/(dashboard)/settings/webhooks/WebhookCreateForm.tsx` のソースコードを確認する  
**WHEN** 成功メッセージ要素のクラスを参照する  
**THEN** `rounded-md` が含まれない

---

## Webhook 配信ログ

### TC-063: 配信ログテーブルのヘッダーが bg-[#dcdde1] スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` のソースコードを確認する  
**WHEN** `<thead>` のクラスを参照する  
**THEN** `bg-[#dcdde1]` と `border border-[#bdc3c7]` が含まれ、`bg-gray-50`, `uppercase` が含まれない

### TC-064: 配信ログのステータスバッジがテキスト表現

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` のソースコードを確認する  
**WHEN** ステータス表示のクラスを参照する  
**THEN** `bg-green-100`, `bg-red-100`, `bg-gray-100`, `rounded` が含まれず、成功は `text-[#1a8a4a]`、失敗は `text-[#c0392b]`、処理中は `text-[#d4880f]` が使用されている

### TC-065: 配信ログに font-mono が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` のソースコードを確認する  
**WHEN** `font-mono` を grep する  
**THEN** 0 件ヒットする

### TC-066: 配信ログのリトライボタンがテキストリンク形式

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` のソースコードを確認する  
**WHEN** リトライボタン要素のクラスを参照する  
**THEN** `text-[#2980b9]` と `underline` が含まれ、`border-blue-300`, `rounded`, `hover:bg-blue-50` が含まれない

### TC-067: 配信ログページのバックリンクが text-xs text-[#2980b9] underline

**Category**: manual  
**Priority**: could  
**Source**: tasks.md > T-12

**GIVEN** `src/app/(dashboard)/settings/webhooks/[id]/deliveries/page.tsx` のソースコードを確認する  
**WHEN** 「← エンドポイント一覧に戻る」リンクのクラスを参照する  
**THEN** `text-xs text-[#2980b9] underline` が含まれる

---

## 代理承認管理

### TC-068: 委譲一覧テーブルのヘッダーが bg-[#dcdde1] スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/settings/delegations/page.tsx` のソースコードを確認する  
**WHEN** `<thead>` のクラスを参照する  
**THEN** `bg-[#dcdde1]` と `border border-[#bdc3c7]` が含まれ、`bg-gray-50`, `uppercase` が含まれない

### TC-069: 委譲一覧テーブルコンテナに rounded-lg/shadow-sm が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/settings/delegations/page.tsx` のソースコードを確認する  
**WHEN** テーブルコンテナのクラスを参照する  
**THEN** `rounded-lg`, `shadow-sm` が含まれず、`bg-white border border-[#e0e0e0]` が含まれる

### TC-070: 委譲一覧のステータスバッジがテキスト表現

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/settings/delegations/page.tsx` のソースコードを確認する  
**WHEN** ステータス表示要素のクラスを参照する  
**THEN** `bg-green-100`, `rounded` が含まれず、有効時は `text-[#1a8a4a] text-xs font-bold`、無効時は `text-[#95a5a6] text-xs` が使用されている

### TC-071: 無効化ボタンがテキストリンク形式

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/settings/delegations/page.tsx` のソースコードを確認する  
**WHEN** 無効化ボタン要素のクラスを参照する  
**THEN** `text-[#c0392b]` と `underline` が含まれ、`border-red-300`, `rounded`, `hover:bg-red-50` が含まれない

### TC-072: 委譲追加フォームの送信ボタンが BTN_SUBMIT

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/settings/delegations/page.tsx` のソースコードを確認する  
**WHEN** フォーム送信ボタンの実装を参照する  
**THEN** `BTN_SUBMIT` 定数が使用されており、`BTN_PRIMARY` や `bg-blue-600` が使われていない

### TC-073: 委譲追加フォームに font-mono が含まれない

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-13

**GIVEN** `src/app/(dashboard)/settings/delegations/page.tsx` のソースコードを確認する  
**WHEN** `font-mono` を grep する  
**THEN** 0 件ヒットする

---

## 監査ログ

### TC-074: 監査ログテーブルのヘッダーが bg-[#dcdde1] スタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを確認する  
**WHEN** `<thead>` のクラスを参照する  
**THEN** `bg-[#dcdde1]` と `border border-[#bdc3c7]` が含まれ、`bg-gray-50`, `uppercase` が含まれない

### TC-075: フィルタフォームがツールバースタイル

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを確認する  
**WHEN** フィルタフォームコンテナのクラスを参照する  
**THEN** `bg-[#f5f5f5] border border-[#cccccc]` が含まれ、`bg-white border border-gray-200 rounded-lg` が含まれない

### TC-076: ページネーションがテキストリンク形式

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを確認する  
**WHEN** ページネーションボタン/リンク要素のクラスを参照する  
**THEN** `text-xs text-[#2980b9] underline` が含まれ、`border border-gray-300 rounded-md` が含まれない

### TC-077: 監査ログに font-mono が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを確認する  
**WHEN** `font-mono` を grep する  
**THEN** 0 件ヒットする

### TC-078: CSV ダウンロードリンクが text-xs text-[#2980b9] underline

**Category**: manual  
**Priority**: should  
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを確認する  
**WHEN** CSV ダウンロードリンクのクラスを参照する  
**THEN** `text-xs text-[#2980b9] underline` が含まれる

### TC-079: 監査ログテーブルコンテナに rounded-lg/shadow-sm が含まれない

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-14

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` のソースコードを確認する  
**WHEN** テーブルコンテナのクラスを参照する  
**THEN** `rounded-lg`, `shadow-sm` が含まれず、`bg-white border border-[#e0e0e0]` が含まれる

---

## ビルド・型チェック・テスト

### TC-080: ビルドが成功する

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ビルドと型チェックが成功する > Scenario: ビルドが成功する

### TC-081: bun test が全件 green

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** すべてのファイル変更が完了している  
**WHEN** `bun test` を実行する  
**THEN** すべてのテストケースが pass し、失敗が 0 件である

### TC-082: TypeScript 型チェックが green

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-15

**GIVEN** すべてのファイル変更が完了している  
**WHEN** TypeScript 型チェックを実行する  
**THEN** 型エラーが 0 件で正常終了する

---

## Result

```yaml
result: completed
total: 82
automated: 8
manual: 74
must: 60
should: 15
could: 7
blocked_reasons: []
```
