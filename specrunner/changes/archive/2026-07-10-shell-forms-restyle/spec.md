# Spec: シェルと共有部品の刷新（サイドバー装飾・フォーム規律・トースト/ダイアログ）

## Requirements

---

### Requirement: サイドバーのセクション分けとアイコン表示

`SidebarNav` は navItems をフラット配列ではなくセクション配列で管理しなければならない。
各セクションには見出しラベルとアイテム群が含まれ、アイテムは絵文字アイコン + ラベルで構成される SHALL。

セクション構成:
- **メイン**: 📊 ダッシュボード
- **営業**: 🏢 顧客 / 📨 引き合い / 💼 案件 / 📋 タスク
- **管理**: 📁 契約 / 💰 売上 / 📝 申請一覧
- **個人・設定**: 👤 アカウント / ⚙️ 設定 / 🧾 監査ログ

#### Scenario: セクションラベルが描画される

**Given** ダッシュボード画面が表示されている
**When** サイドバーを目視確認する
**Then** 「メイン」「営業」「管理」「個人・設定」の 4 セクションラベルが表示される

#### Scenario: アイコンがラベル左に固定幅で表示される

**Given** SidebarNav が描画されている
**When** 各ナビゲーション項目を確認する
**Then** 各項目の先頭に `inline-block w-5` の絵文字アイコンが表示され、ラベルと同行に並ぶ

---

### Requirement: サイドバー active スタイルの `border-primary` 化

active 項目は `border-l-[3px] border-primary` のアクセントボーダーを持たなければならない SHALL。
`border-white` は削除し、背景 `bg-white/10` と白文字は維持する。

#### Scenario: active 項目に border-primary が付く

**Given** 現在のパスが `/dashboard` である
**When** SidebarNav を確認する
**Then** ダッシュボード項目のクラスに `border-primary` が含まれる

#### Scenario: 非 active 項目に border-primary が付かない

**Given** 現在のパスが `/dashboard` である
**When** 顧客項目を確認する
**Then** 顧客項目のクラスに `border-primary` が含まれない

---

### Requirement: 申請バッジの配線

「申請一覧」項目の右端に pending 件数ピルが表示されなければならない SHALL。
0 件のときはピルを非表示とする。

`SidebarNav` は `badgeCount?: number` props を受け取り、1 以上の場合にピルを描画する。
ピルのクラスは `bg-danger text-white text-2xs font-bold rounded-full min-w-4 h-4 px-1`。

layout.tsx（server）は `listRequests` の結果から「自分の role が対応すべき pending ステップを持つ
申請数」を計算して `SidebarNav` に渡す。

#### Scenario: 未承認申請がある場合にバッジが表示される

**Given** ログインユーザーが approver であり、pending な申請が 3 件存在する
**When** サイドバーを確認する
**Then** 申請一覧項目の右端に "3" と表示されたピルが表示される

#### Scenario: pending 申請が 0 件の場合にバッジが非表示になる

**Given** ログインユーザーの role で対応すべき pending 申請が 0 件
**When** サイドバーを確認する
**Then** 申請一覧項目にピルが表示されない

---

### Requirement: サイドバー幅とロゴ行の更新

サイドバー幅は `w-[220px]` でなければならない SHALL。
ロゴ行は `h-14` 固定高さ、下線 `border-b border-white/10` を持つ。

#### Scenario: サイドバーの幅が 220px になる

**Given** ダッシュボードレイアウトが描画されている
**When** aside 要素のクラスを確認する
**Then** `w-[220px]` が含まれる

---

### Requirement: NotificationPanel の未定義トークン修正

`NotificationPanel.tsx` は `dark:bg-bg-card` を参照してはならない SHALL。
代わりに既存の有効なトークン（`bg-white dark:bg-bg-surface` 相当）を使用する。
パネル幅は `w-[340px]` とする。パネルの左オフセットはサイドバー幅に合わせ `left-[220px]` とする。

#### Scenario: dark テーマでパネル背景が正常に描画される

**Given** テーマが dark である
**When** 通知パネルを開く
**Then** パネル背景が正常に表示される（bg-bg-card への参照が存在しない）

---

### Requirement: ユーザー領域の頭文字アバター追加

ユーザー領域の左に 32px の円形アバターが表示されなければならない SHALL。
アバターは `bg-primary text-white font-bold` のスタイルで、氏名の頭 1 文字を表示する。
氏名は `text-xs text-text-on-dark-secondary`・ロールは `text-2xs text-text-on-dark-muted` の縦 2 段で表示する。

#### Scenario: アバターと縦 2 段テキストが描画される

**Given** ログインユーザーの氏名が「山田太郎」である
**When** サイドバー下部のユーザー領域を確認する
**Then** 「山」と表示された 32px 円形アバターが表示される
**And** 「山田太郎」と「ロール」が縦 2 段で表示される

---

### Requirement: ログアウトボタンの danger 色化

ログアウトボタンは danger 系のトークン色（`text-status-red-text`）を持たなければならない SHALL。
文言は「[ログアウト]」のまま不変。

#### Scenario: ログアウトボタンが danger 色で表示される

**Given** ダッシュボードが表示されている
**When** サイドバー下部のログアウトボタンを確認する
**Then** ボタンのテキスト色クラスに `text-status-red-text` が含まれる

---

### Requirement: FormField ラベルスタイルの統一

`FormField` のラベルは `text-xs font-semibold text-text-secondary` でなければならない SHALL。
`FORM_LABEL` 定数を同値に更新し、`FormField` は `FORM_LABEL` を参照する（二重管理の解消）。

#### Scenario: FormField ラベルのクラスが更新される

**Given** `FormField.tsx` が描画されている
**When** label 要素のクラスを確認する
**Then** `font-semibold` と `text-text-secondary` が含まれ、`font-bold text-text` は含まれない

---

### Requirement: FormField の `required` props

`FormField` は `required?: boolean` props を受け取り、true のときにラベル末尾に
`<span className="text-danger"> *</span>` を描画しなければならない SHALL。

全フォームで HTML の `required` 属性を持つ入力・実装上必須の入力に `required` prop を付与する。

#### Scenario: required=true のとき * が表示される

**Given** `<FormField label="案件名" required>` が描画される
**When** ラベルを確認する
**Then** ラベル末尾に「*」がレンダリングされる（`text-danger` クラス付き）

#### Scenario: required 未指定のとき * が表示されない

**Given** `<FormField label="備考">` が描画される
**When** ラベルを確認する
**Then** ラベルに「*」が含まれない

---

### Requirement: 入力部品のエラー赤枠

`Input` / `Select` / `Textarea` / `MoneyInput` は `invalid?: boolean` props を受け取り、
true のとき `border-danger focus:border-danger` クラスが追加されなければならない SHALL。
`FormField` の `error` 文字列と組み合わせて使用する（既存の赤メッセージは維持）。

#### Scenario: invalid=true のとき赤枠が付く

**Given** `<Input invalid />` が描画される
**When** input 要素のクラスを確認する
**Then** `border-danger` が含まれる

#### Scenario: invalid 未指定のとき赤枠が付かない

**Given** `<Input />` が描画される
**When** input 要素のクラスを確認する
**Then** `border-danger` が含まれない

---

### Requirement: Textarea の min-h-20 追加

`Textarea` は `min-h-20`（80px）を持たなければならない SHALL。
既存の `rows` 指定は併存可能。

#### Scenario: Textarea に最小高さが設定される

**Given** `<Textarea />` が描画される
**When** textarea 要素のクラスを確認する
**Then** `min-h-20` が含まれる

---

### Requirement: deals/new・contracts/new の 2 カラム化

`NewDealForm.tsx` と `NewContractForm.tsx` はフォーム本体を
`grid grid-cols-2 gap-x-6 gap-y-4` レイアウトにしなければならない SHALL。
備考・textarea 等の長文項目は `col-span-2` とする。
項目・並び順・ラベル・送信挙動は不変。

#### Scenario: deals/new が 2 カラムになる

**Given** `NewDealForm.tsx` が描画される
**When** フォームグリッドコンテナのクラスを確認する
**Then** `grid-cols-2` と `gap-x-6` が含まれる

---

### Requirement: clients/new・inquiries/new の gap 統一

`ClientForm.tsx` と `InquiryForm.tsx` のグリッドの gap は `gap-x-6 gap-y-4` 相当に統一しなければならない SHALL。
列構成 (`grid-cols-2`) は現状維持。

#### Scenario: ClientForm のグリッド gap が統一される

**Given** `ClientForm.tsx` が描画されている
**When** フォームグリッドコンテナのクラスを確認する
**Then** `gap-x-6` が含まれる

#### Scenario: InquiryForm のグリッド gap が統一される

**Given** `InquiryForm.tsx` が描画されている
**When** フォームグリッドコンテナのクラスを確認する
**Then** `gap-x-6` が含まれる

---

### Requirement: Toast の刷新

Toast は以下の仕様を満たさなければならない SHALL:
- 位置: `bottom-4 right-4`（右下）
- 背景: `bg-bg-toast text-text-on-dark`（ダーク地・白文字）
- success プレフィックス: `✓`（`text-status-green-text` 色）
- error プレフィックス: `✗`（`text-status-red-text` 色）
- 左カラーバー廃止
- アニメーション: `toast-slide-in` キーフレーム（translateX 60px + opacity 0 → 0 + opacity 1、0.25s ease）

`globals.css` に以下を追加する:
- `:root` と `[data-theme="dark"]` に `--bg-toast` トークン定義（ライト `#1e293b` / ダーク `#334155`）
- `@theme inline` に `--color-bg-toast: var(--bg-toast)` 配線
- `@keyframes toast-slide-in` の定義

自動消滅 3 秒・`showToast` API・既存呼び出し箇所は不変。

#### Scenario: Toast が右下に表示される

**Given** `showToast("テスト", "success")` が呼ばれた
**When** Toast 要素のクラスを確認する
**Then** `bottom-4` と `right-4` が含まれ、`top-4` は含まれない

#### Scenario: success Toast に ✓ プレフィックスが付く

**Given** variant が "success" の Toast が表示されている
**When** Toast 要素のテキストを確認する
**Then** 「✓」が先頭に表示される

#### Scenario: error Toast に ✗ プレフィックスが付く

**Given** variant が "error" の Toast が表示されている
**When** Toast 要素のテキストを確認する
**Then** 「✗」が先頭に表示される

---

### Requirement: 新規作成成功時のトースト表示

以下の 4 フォームは、作成成功時に `router.push` の直前に `showToast` を呼ばなければならない SHALL:

| フォーム | 文言 |
|---|---|
| `ClientForm.tsx` | `顧客を登録しました` |
| `InquiryForm.tsx` | `引き合いを登録しました` |
| `NewDealForm.tsx` | `案件を作成しました` |
| `NewContractForm.tsx` | `契約を作成しました` |

variant はすべて `"success"`。リダイレクト先・作成処理は不変。

#### Scenario: 顧客登録成功時にトーストが表示される

**Given** `ClientForm.tsx` が `useToast` をインポートしており、`createClientAction` が成功する
**When** フォームを送信する
**Then** `showToast("顧客を登録しました", "success")` が呼ばれ、その後 `router.push("/clients")` が実行される

---

### Requirement: ConfirmDialog の整形

`ConfirmDialog` は以下の構造を持たなければならない SHALL:
- overlay: `bg-black/45`
- 本体: `maxWidth: 480`・`rounded-lg`
- header（title 行）/ body（message + children）/ footer（ボタン行）を `border-b` / `border-t` で区切った 3 分割
- キャンセルボタン: `BTN_SECONDARY` クラス
- 確定ボタン: `BTN_PRIMARY`（`variant="danger"` 時は `BTN_DANGER`）クラス

#### Scenario: ボタンに角丸クラスが含まれる

**Given** ConfirmDialog が開いている
**When** キャンセルボタンと確定ボタンのクラスを確認する
**Then** 両ボタンに `rounded` が含まれる（BTN_SECONDARY / BTN_PRIMARY / BTN_DANGER はいずれも `rounded` を含む）

#### Scenario: variant="danger" 時に確定ボタンが BTN_DANGER になる

**Given** `variant="danger"` で ConfirmDialog が開いている
**When** 確定ボタンのクラスを確認する
**Then** `bg-danger` が含まれる

---

### Requirement: ActionItemModal のラベル・select 統一

`ActionItemModal` は以下を満たさなければならない SHALL:
- 全ラベル要素に `FORM_LABEL` 定数のクラスを適用する（`text-xs font-semibold text-text-secondary`）
- 担当者の生 `<select>` を共有 `Select` コンポーネントに置換する
- overlay・幅 560px・開閉挙動は不変

#### Scenario: 担当者フィールドが Select コンポーネントを使う

**Given** ActionItemModal が描画されている
**When** 担当者フィールドのソースを確認する
**Then** 共有 `Select` コンポーネントが使用されている（生 `<select>` ではない）

---

### Requirement: 生パレット・hex 直書きクラスの持ち込み禁止

`src/app` 配下に生パレット（`slate-800` 等）・hex 直書きクラス（`bg-[#xxx]` 形式）を
新たに持ち込んではならない SHALL。すべてデザイントークン参照とする。

#### Scenario: 変更後のファイルに hex 直書きクラスが存在しない

**Given** 本 change で変更されたすべての `src/app` 配下のファイル
**When** ファイル内容を検査する
**Then** `bg-[#` / `text-[#` 形式の hex 直書きクラスが新たに追加されていない

---

### Requirement: architecture test と aozu check が green を維持

本 change は `src/app` 配下のみを変更するため、domain/application/infrastructure 層への
依存追加は発生しない。`aozu check` exit 0 および architecture test green を維持しなければならない SHALL。

#### Scenario: aozu check が exit 0 で終了する

**Given** 本 change の全ファイルが適用されている
**When** `aozu check` を実行する
**Then** exit code 0 で終了する

#### Scenario: architecture test が green になる

**Given** 本 change の全ファイルが適用されている
**When** `bun test` でアーキテクチャテストを実行する
**Then** レイヤー依存違反が検出されない（architecture test が pass する）
