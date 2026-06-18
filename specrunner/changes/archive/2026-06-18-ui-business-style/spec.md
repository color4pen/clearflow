# Spec: UIを業務システムスタイルにリデザイン

## Requirements

### Requirement: ダッシュボードヘッダーは36px以下の高さで濃紺背景である

The dashboard header SHALL use `bg-slate-900` background with `py-1` or less padding, resulting in a height of 36px or less. The logo "Clearflow" SHALL be displayed in white text at 13px. Navigation links (申請一覧・設定・監査ログ) SHALL be placed inline within the header. User name, role, and logout MUST be positioned at the right end. The settings link and audit log link SHALL be visible only to admin (既存の settings/layout.tsx の admin リダイレクトと整合).

#### Scenario: ヘッダーの外観

**Given** ダッシュボードレイアウトが描画される
**When** ヘッダー要素を確認する
**Then** ヘッダーは `bg-slate-900` 背景、`py-1` 以下のパディングを持ち、ロゴは白文字13pxで表示される

#### Scenario: ナビゲーションリンクの表示（admin）

**Given** admin ロールでログインしている
**When** ヘッダーを確認する
**Then** 「申請一覧」「設定」「監査ログ」のリンクがヘッダー内にインラインで表示される

#### Scenario: ナビゲーションリンクの表示（member）

**Given** member ロールでログインしている
**When** ヘッダーを確認する
**Then** 「申請一覧」のリンクのみが表示され、「設定」「監査ログ」は表示されない

### Requirement: ステータス表示はバッジスタイルを使わず色テキストのみで表現する

Status display MUST NOT use `rounded-full` badge styling. Status SHALL be rendered as colored text only with `font-medium` or `font-bold`. Color mapping: pending=`text-amber-700 font-bold`, approved=`text-emerald-700`, rejected=`text-red-700`, revision=`text-orange-600 font-bold`, expired=`text-gray-400`, draft=`text-gray-500`.

#### Scenario: 一覧テーブルのステータス表示

**Given** 申請一覧ページに各ステータスの申請が存在する
**When** テーブルのステータス列を確認する
**Then** 各ステータスは `rounded-full` や背景色のバッジではなく、指定された色のテキストのみで表示される

#### Scenario: 詳細画面のステータス表示

**Given** 申請詳細ページを表示する
**When** ステータス表示を確認する
**Then** `rounded-full` バッジスタイルが使われておらず、色テキストのみで表示される

### Requirement: statusLabel と statusClass は statusUtils.ts に一元定義される

`statusLabel` and `statusClass` SHALL be defined in `src/app/(dashboard)/requests/statusUtils.ts`. The duplicate definitions in `requests/page.tsx` and `requests/[id]/page.tsx` MUST be removed. Both pages SHALL import from `statusUtils.ts`.

#### Scenario: 重複コードの解消

**Given** `requests/page.tsx` と `requests/[id]/page.tsx` を確認する
**When** ファイル内に `statusLabel` または `statusClass` の関数定義を検索する
**Then** どちらのファイルにも関数定義は存在せず、`statusUtils.ts` からのインポートのみがある

### Requirement: 申請一覧テーブルは高密度レイアウトで承認進捗列と期限列を含む

Table rows SHALL use `py-0.5` padding for a compact 28px row height. Table headers SHALL use `bg-slate-50 text-xs text-slate-500 font-medium uppercase`. Pending rows SHALL have `bg-amber-50` background and revision rows SHALL have `bg-orange-50` background. The table MUST include an approval progress column (`● ○ manager → finance` format) and a deadline column. Deadlines within 3 days MUST be displayed with `text-red-600 font-bold`.

#### Scenario: テーブル行の高密度化

**Given** 申請一覧テーブルが表示される
**When** テーブル行のパディングを確認する
**Then** セルのパディングは `py-0.5` 以下で、行高28px相当である

#### Scenario: 承認待ち行の背景色

**Given** status が `pending` の申請が一覧に存在する
**When** その行を確認する
**Then** 行の背景色に `bg-amber-50` が適用されている

#### Scenario: 承認進捗列の表示

**Given** 承認ステップが `manager(approved) → finance(pending)` の申請がある
**When** 一覧テーブルの進捗列を確認する
**Then** `● ○ manager → finance` のような形式で進捗が表示される

#### Scenario: 期限の強調表示

**Given** 期限が残り2日の承認ステップがある申請が一覧に存在する
**When** 期限列を確認する
**Then** `text-red-600 font-bold` で表示される

### Requirement: 設定タブに active 状態スタイルが適用される

The active tab SHALL have `border-b-2 border-blue-600 text-blue-600 font-medium` applied based on the current path. Inactive tabs SHALL use `text-gray-500 hover:text-gray-700`. The tab navigation MUST be implemented as a Client Component using `usePathname()`.

#### Scenario: active タブの視覚的区別

**Given** `/settings/templates` ページを表示している
**When** 設定ナビゲーションのタブを確認する
**Then** 「テンプレート」タブに `border-b-2 border-blue-600 text-blue-600` が適用され、他のタブは `text-gray-500` で表示される

### Requirement: 設定ナビゲーションに代理承認リンクが含まれる

NAV_ITEMS SHALL include `{ href: "/settings/delegations", label: "代理承認" }`.

#### Scenario: 代理承認リンクの存在

**Given** 設定ページを表示している
**When** ナビゲーションタブを確認する
**Then** 「代理承認」のリンクが存在し、`/settings/delegations` に遷移する

### Requirement: フッター統計が一覧テーブル下に表示される

A footer summary SHALL be displayed below the list table with `text-xs text-slate-400` styling. The format MUST be: `N件中 1-N件表示 | 承認待: X件 承認済: Y件 却下: Z件`.

#### Scenario: フッター統計の表示

**Given** 申請が24件あり、うち承認待8件、承認済12件、却下3件、下書き1件の場合
**When** 一覧テーブル下のフッターを確認する
**Then** `24件中 1-24件表示 | 承認待: 8件 承認済: 12件 却下: 3件` 形式で表示される

### Requirement: ボタン・inputのスタイルが styles.ts の定数を参照する

`src/app/(dashboard)/styles.ts` SHALL define `BTN_PRIMARY`, `BTN_SECONDARY`, `BTN_DANGER`, `BTN_SUCCESS`, `BTN_WARNING`, `INPUT_BASE`, and `SELECT_BASE` as exported constants. Dashboard pages MUST reference these constants instead of hardcoded Tailwind class strings.

#### Scenario: ボタンスタイルの定数参照

**Given** `src/app/(dashboard)/requests/[id]/ActionButtons.tsx` のソースコードを確認する
**When** ボタンの className を確認する
**Then** `BTN_PRIMARY` 等の定数を `styles.ts` からインポートして参照しており、Tailwindクラスの直接記述はない

#### Scenario: styles.ts の定数定義

**Given** `src/app/(dashboard)/styles.ts` を確認する
**When** エクスポートされた定数を確認する
**Then** `BTN_PRIMARY`, `BTN_SECONDARY`, `BTN_DANGER`, `INPUT_BASE` が定義されている
