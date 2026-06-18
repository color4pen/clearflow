# Spec: 業務システムUIを全ページに展開

## Requirements

### Requirement: styles.ts の定数はすべて業務システムスタイルを返す

styles.ts が export する全定数は、業務システムのデザインルールに準拠した Tailwind クラス文字列を返さなければならない (SHALL)。旧スタイルのクラス（`rounded-md`, `rounded-lg`, `shadow-sm`, `shadow`, `bg-blue-600`, `bg-red-600`, `bg-green-600`, `bg-orange-500`）を含んではならない (MUST NOT)。

#### Scenario: BTN_PRIMARY がテキストリンクスタイルを返す

**Given** styles.ts が import されている
**When** `BTN_PRIMARY` を参照する
**Then** 文字列に `text-[#2980b9]` と `underline` が含まれ、`bg-blue-600` や `rounded-md` が含まれない

#### Scenario: INPUT_BASE が業務システムスタイルを返す

**Given** styles.ts が import されている
**When** `INPUT_BASE` を参照する
**Then** 文字列に `rounded-none` と `border-[#cccccc]` が含まれ、`shadow-sm` や `rounded-md` が含まれない

### Requirement: 全ページから旧スタイルクラスが除去されている

対象ディレクトリ (`src/app/`) 配下の `.tsx` ファイルは、`rounded-md`, `rounded-lg`, `shadow-sm`, `shadow-md`, `shadow` (shadow-none を除く), `bg-blue-600` を含んではならない (MUST NOT)。

#### Scenario: rounded-md が全ファイルに存在しない

**Given** ビルドが成功している
**When** `src/app/` 配下で `rounded-md` を grep する
**Then** 0件がヒットする

#### Scenario: bg-blue-600 が全ファイルに存在しない

**Given** ビルドが成功している
**When** `src/app/` 配下で `bg-blue-600` を grep する
**Then** 0件がヒットする

### Requirement: 全テーブルヘッダーが統一スタイルを持つ

すべての `<thead>` 要素は `bg-[#dcdde1]` 背景を持たなければならない (SHALL)。ヘッダーセルのテキストは `text-xs text-[#2c3e50] font-bold` でなければならない (SHALL)。

#### Scenario: テンプレート管理テーブルのヘッダーが正しい

**Given** テンプレート管理ページが表示されている
**When** テーブルヘッダーのスタイルを確認する
**Then** `<thead>` の `<tr>` に `bg-[#dcdde1]` が含まれ、`<th>` に `text-xs text-[#2c3e50] font-bold` が含まれる

### Requirement: フォーム送信ボタンは最小限の塗りボタンスタイルを使用する

フォームの送信ボタン（ログイン、申請作成、テンプレート作成/編集、Webhook 作成、委譲作成）は `bg-[#2980b9] text-white text-xs px-3 py-1 rounded-none` を使用しなければならない (SHALL)。テキストリンクではなく塗りボタンとすることで、フォーム送信とナビゲーションリンクを区別する。

#### Scenario: ログインボタンが塗りボタンである

**Given** ログインページが表示されている
**When** ログインボタンのスタイルを確認する
**Then** `bg-[#2980b9]` と `text-white` と `rounded-none` が含まれ、`rounded-md` や `shadow-sm` が含まれない

### Requirement: アクション操作はテキストリンク形式で表示される

承認・却下・差戻し・再申請・編集・削除等のアクション操作は、テキストリンク形式（`text-[#2980b9] underline` または `text-[#c0392b] underline`）で表示されなければならない (SHALL)。塗りボタン（`bg-*-600`）を使用してはならない (MUST NOT)。

#### Scenario: 申請詳細ページの承認ボタンがテキストリンクである

**Given** pending 状態の申請詳細ページが表示されている
**When** 承認ボタンのスタイルを確認する
**Then** テキストリンク形式（`underline`）で表示され、`bg-green-600` が含まれない

### Requirement: font-mono が使用されていない

`src/app/` 配下の `.tsx` ファイルは `font-mono` クラスを含んではならない (MUST NOT)。すべてのテキストは sans-serif (Geist) で統一する。

#### Scenario: Webhook URL 表示が sans-serif

**Given** Webhook 設定ページが表示されている
**When** エンドポイント URL のフォントスタイルを確認する
**Then** `font-mono` が含まれず、sans-serif フォントで表示されている

### Requirement: ビルドと型チェックが成功する

変更後のコードは `bun run build` と TypeScript 型チェックに成功しなければならない (MUST)。

#### Scenario: ビルドが成功する

**Given** すべてのファイル変更が完了している
**When** `bun run build` を実行する
**Then** エラーなくビルドが完了する
