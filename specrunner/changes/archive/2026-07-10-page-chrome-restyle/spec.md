# Spec: 画面骨格の格上げ

## Requirements

### Requirement: PageToolbar はページタイトルを h1 要素で描画する

`PageToolbar` コンポーネントの `title` prop SHALL `<h1>` 要素として描画され、`text-lg font-bold` クラスを持つ。外枠は `bg-bg-toolbar` 背景色クラスを持たない。

#### Scenario: PageToolbar がタイトルを h1 で描画する

**Given** `PageToolbar.tsx` のソースコードを読む
**When** タイトル描画要素のタグを確認する
**Then** `<h1` が存在し、`text-lg font-bold` クラスを持つ

#### Scenario: PageToolbar の外枠に bg-bg-toolbar が含まれない

**Given** `PageToolbar.tsx` のソースコードを読む
**When** 外枠 div のクラス文字列を確認する
**Then** `bg-bg-toolbar` が含まれない

---

### Requirement: EmptyState コンポーネントは icon・message・children を条件に応じて描画する

`EmptyState` コンポーネントは `icon`（省略可）・`message`（必須）・`children`（省略可）の props を受け取り SHALL、`icon` が渡された場合は絵文字要素を、省略された場合は絵文字要素なしでメッセージを描画する。`children` が渡された場合はメッセージの下に描画する。

#### Scenario: icon あり EmptyState を描画する

**Given** `EmptyState.tsx` が `icon="📋"` と `message="タスクはありません"` を受け取る
**When** コンポーネントを静的解析する
**Then** icon prop が描画されるコードパスが存在し、絵文字の描画が条件分岐で制御されている

#### Scenario: icon なし EmptyState を描画する

**Given** `EmptyState.tsx` の `icon` prop が省略される
**When** コンポーネントの条件分岐を確認する
**Then** `icon` が falsy の場合に絵文字要素をスキップするコードパスが存在する

#### Scenario: children を持つ EmptyState を描画する

**Given** `EmptyState.tsx` が `children` prop を受け取る
**When** コンポーネントのソースを確認する
**Then** `children` が描画されるコードが存在する

---

### Requirement: 新規作成導線 6 箇所が BTN_PRIMARY スタイルのリンクである

deals・inquiries・clients・requests・settings/policies・settings/templates の各一覧ページの新規作成リンクは、`BTN_PRIMARY` 定数（`bg-primary` および `text-white` を含む）のクラスを持つ SHALL。ブラケット文字 `[` `]` を含まない。`＋` プレフィックスを含む。contracts/page.tsx には新規作成導線を追加しない SHALL NOT（`/contracts/new` は `?dealId=` 必須の案件起点フロー）。

#### Scenario: deals/page.tsx の新規作成が BTN_PRIMARY を使用する

**Given** `deals/page.tsx` のソースを確認する
**When** 新規作成 Link のクラスと文言を確認する
**Then** `BTN_PRIMARY` またはその文字列値（`bg-primary text-white` 等）が含まれ、`[新規作成]` というブラケット表記が存在しない

#### Scenario: contracts/page.tsx に新規作成リンクが存在しない

**Given** `contracts/page.tsx` のソースを確認する
**When** PageToolbar の actions を確認する
**Then** `/contracts/new` へのリンクが存在しない

---

### Requirement: 詳細ヒーロー行は h1 と StatusBadge が同一 flex コンテナに存在する

inquiries/[id]・contracts/[id]・contracts/[id]/invoices/[invoiceId]・requests/[id] の各ページは SHALL、`flex items-center gap-2 flex-wrap` のコンテナ内に `h1` 要素と `StatusBadge` コンポーネントが同居する。パンくずは一覧リンクから当該ページへの順序（「一覧 > タイトル」）で構成される。旧 `bg-bg-toolbar border border-border` バーが除去されている。

#### Scenario: inquiries/[id] のヒーロー行に h1 と StatusBadge が存在する

**Given** `inquiries/[id]/page.tsx` のソースを確認する
**When** ヒーロー行のマークアップを確認する
**Then** `<h1` と `StatusBadge` が存在し、パンくずに `/inquiries` へのリンクが含まれる。`bg-bg-toolbar border border-border` は存在しない

#### Scenario: contracts/[id] のヒーロー行でステータスバッジが dl から移動している

**Given** `contracts/[id]/page.tsx` のソースを確認する
**When** dl 内のステータス行を確認する
**Then** dl の `<dt>ステータス</dt>` の行が存在しない（ヒーロー行に移動済み）

#### Scenario: requests/[id] のカード外にヒーロー行が存在する

**Given** `requests/[id]/page.tsx` のソースを確認する
**When** SectionCard の外部構造を確認する
**Then** SectionCard 外に `<h1` と `StatusBadge` の使用が存在し、「← 申請一覧に戻る」テキストが存在しない

---

### Requirement: タブは下線式（border-b-2）スタイルに統一されている

requests・tasks・inquiries の各タブは `border-b-2` クラスをアクティブ/非アクティブ状態の区別に使用 SHALL する。inquiries の塗りボタン式（`bg-primary text-white border-primary` の組み合わせ）がタブ要素に使用されない。RequestTabs の件数 pill（`rounded-full bg-primary text-white`）が存在しない。

#### Scenario: InquiryListView のタブが border-b-2 を使用する

**Given** `inquiries/InquiryListView.tsx` のソースを確認する
**When** ステータスタブのクラス文字列を確認する
**Then** `border-b-2` が含まれ、タブ button 要素に `bg-primary text-white border-primary` の組み合わせが存在しない

#### Scenario: RequestTabs の件数 pill が削除されている

**Given** `requests/RequestTabs.tsx` のソースを確認する
**When** タブ内の件数表示方法を確認する
**Then** `rounded-full bg-primary text-white` の件数 pill クラスが存在しない

---

### Requirement: src/app 配下に生パレットクラスを新たに持ち込まない

本変更で追加・変更するファイルは SHALL、`bg-red-[数値]`・`border-red-[数値]`・`bg-green-[数値]`・`bg-yellow-[数値]`・`text-[#` 等の生パレット直書きクラスを含まない。ログイン画面の `bg-red-50`・`border-red-200` はトークン参照に置換される。

#### Scenario: ログイン画面のエラー表示がトークン参照を使用する

**Given** `(auth)/login/page.tsx` のソースを確認する
**When** エラー表示の div のクラスを確認する
**Then** `bg-status-red-bg` が含まれ、`bg-red-50` が含まれない

---

### Requirement: ログイン画面のグラジエント背景は CSS カスタムプロパティ経由で適用される

ログイン画面の最外 div の背景 SHALL は `var(--bg-login-gradient)` を参照する。hex 値を JSX の className または style に直書きしない。`--bg-login-gradient` は `globals.css` で定義される。サブコピーの文言は「案件管理システム」である。

#### Scenario: globals.css に --bg-login-gradient が定義されている

**Given** `globals.css` のソースを確認する
**When** カスタムプロパティ定義を確認する
**Then** `--bg-login-gradient` が `:root` ブロック内に定義されている

#### Scenario: ログイン画面のサブコピーが変更されている

**Given** `(auth)/login/page.tsx` のソースを確認する
**When** サブコピーテキストを確認する
**Then** 「案件管理システム」が含まれ、「承認ワークフローシステム」が含まれない
