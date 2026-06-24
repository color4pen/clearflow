# Spec: Tailwind テーマ基盤の更新とサイドバーレイアウトへの移行

## Requirements

### Requirement: フォントが Noto Sans JP / IBM Plex Mono で表示される

アプリケーション全体のフォントを Geist / Geist_Mono から Noto Sans JP / IBM Plex Mono に変更する。layout.tsx の next/font/google インポートを変更し、Tailwind テーマの `--font-sans` / `--font-mono` CSS 変数を新フォントの CSS 変数に接続する MUST。body のベースフォントサイズを 13px に設定する SHALL。

#### Scenario: layout.tsx が Noto Sans JP と IBM Plex Mono をインポートする

**Given** `src/app/layout.tsx` を確認する
**When** フォントインポート部分を見る
**Then** `Noto_Sans_JP` と `IBM_Plex_Mono` が `next/font/google` からインポートされており、Geist / Geist_Mono のインポートが存在しない

#### Scenario: Tailwind テーマの font-sans / font-mono が新フォントを参照する

**Given** `src/app/globals.css` の `@theme inline` ブロックを確認する
**When** `--font-sans` と `--font-mono` の値を見る
**Then** `--font-sans` が Noto Sans JP の CSS 変数を参照し、`--font-mono` が IBM Plex Mono の CSS 変数を参照している

#### Scenario: body のベースフォントサイズが 13px である

**Given** `src/app/globals.css` の body スタイルを確認する
**When** font-size の値を見る
**Then** `font-size: 13px` が設定されている

### Requirement: カスタムフォントサイズユーティリティが Tailwind テーマに定義される

デザインが要求する 4 種のカスタムフォントサイズを Tailwind テーマトークンとして定義する SHALL。各サイズに line-height を明示する MUST。

#### Scenario: text-2xs が 10px / line-height 1.4 で定義される

**Given** `src/app/globals.css` の `@theme inline` ブロックを確認する
**When** `--text-2xs` の定義を見る
**Then** font-size が `0.625rem`（10px）、line-height が `1.4` で定義されている

#### Scenario: text-table-head が 11px / line-height 1.4 で定義される

**Given** `src/app/globals.css` の `@theme inline` ブロックを確認する
**When** `--text-table-head` の定義を見る
**Then** font-size が `0.6875rem`（11px）、line-height が `1.4` で定義されている

#### Scenario: text-base-app が 12.5px / line-height 1.5 で定義される

**Given** `src/app/globals.css` の `@theme inline` ブロックを確認する
**When** `--text-base-app` の定義を見る
**Then** font-size が `0.78125rem`（12.5px）、line-height が `1.5` で定義されている

#### Scenario: text-body が 13px / line-height 1.5 で定義される

**Given** `src/app/globals.css` の `@theme inline` ブロックを確認する
**When** `--text-body` の定義を見る
**Then** font-size が `0.8125rem`（13px）、line-height が `1.5` で定義されている

### Requirement: 全コンポーネントの角丸が rounded（4px）に統一される

FormField（Input, Select, Textarea）、SubmitButton、SectionCard、MoneyInput、MarkdownTextarea の `rounded-none` を `rounded` に変更する MUST。styles.ts の INPUT_BASE, SELECT_BASE, BTN_SUBMIT も同様に更新する SHALL。

#### Scenario: FormField の入力要素が rounded を持つ

**Given** `src/app/components/FormField.tsx` の Input, Select, Textarea コンポーネントを確認する
**When** className を見る
**Then** `rounded` が含まれ、`rounded-none` が含まれない

#### Scenario: styles.ts の定数が rounded を持つ

**Given** `src/app/(dashboard)/styles.ts` を確認する
**When** INPUT_BASE, SELECT_BASE, BTN_SUBMIT の値を見る
**Then** 各定数に `rounded` が含まれ、`rounded-none` が含まれない

#### Scenario: MoneyInput が rounded を持つ

**Given** `src/app/components/MoneyInput.tsx` の baseClass を確認する
**When** className を見る
**Then** `rounded` が含まれ、`rounded-none` が含まれない

### Requirement: SectionCard がデザイン仕様のスタイルを持つ

SectionCard のボーダーを `border-border`（#cccccc）に変更し、`rounded`（4px）と `shadow-sm` を追加する SHALL。

#### Scenario: SectionCard にボーダー、角丸、シャドウがある

**Given** `src/app/components/SectionCard.tsx` を確認する
**When** className を見る
**Then** `border-border`（`border-border-light` ではなく）、`rounded`、`shadow-sm` が含まれている

#### Scenario: styles.ts の SECTION_CARD が更新されている

**Given** `src/app/(dashboard)/styles.ts` の SECTION_CARD を確認する
**When** 値を見る
**Then** `border-border`、`rounded`、`shadow-sm` が含まれている

### Requirement: ダッシュボードがサイドバーレイアウトで表示される

`src/app/(dashboard)/layout.tsx` を横ナビバーからサイドバーレイアウトに構造変更する MUST。サイドバーは左側 210px 固定幅で、ロゴ・ナビゲーション・ユーザー情報を含む SHALL。

#### Scenario: サイドバーが左側 210px に表示される

**Given** ダッシュボードページにアクセスする
**When** レイアウトを確認する
**Then** 左側にサイドバー（幅 210px、背景色 #2c3e50）が表示され、右側にメインコンテンツが表示される

#### Scenario: サイドバーにロゴが表示される

**Given** サイドバーの上部を確認する
**When** ロゴエリアを見る
**Then** 「Clearflow」（15px, bold, 白）と「案件管理」（10px, #7f95a8）が表示される

#### Scenario: ナビゲーションリンクがサイドバーに縦並びで表示される

**Given** サイドバーのナビゲーションを確認する
**When** リンク一覧を見る
**Then** ダッシュボード、顧客、引き合い、案件、契約、売上、申請一覧、設定、監査ログのリンクがテキストラベルのみで縦並びに表示される

#### Scenario: ユーザー情報がサイドバー下部に表示される

**Given** サイドバーの下部を確認する
**When** ユーザー情報エリアを見る
**Then** ユーザー名、ロール、ログアウトリンク、テーマ切替が表示される

#### Scenario: メインコンテンツが max-width 1260px で表示される

**Given** メインコンテンツ領域を確認する
**When** レイアウトを見る
**Then** max-width が 1260px で、padding が 22px 28px 56px で表示される

### Requirement: DataTable のスタイルがデザイン仕様に合致する

DataTable のヘッダー行とデータ行の padding・フォントサイズを更新する SHALL。行の区切りを `border-b border-border-light` に変更する MUST。

#### Scenario: ヘッダー行のスタイルが更新される

**Given** `src/app/components/DataTable.tsx` のヘッダー行を確認する
**When** th の className を見る
**Then** `px-3.5 py-2 text-table-head font-medium` が含まれている

#### Scenario: データ行のスタイルが更新される

**Given** `src/app/components/DataTable.tsx` のデータ行を確認する
**When** td の className を見る
**Then** `px-3.5 py-2.5 text-base-app` が含まれている

#### Scenario: 行区切りが border-b で表示される

**Given** `src/app/components/DataTable.tsx` の tr を確認する
**When** className を見る
**Then** `border-b border-border-light` が含まれ、`border border-border-light` は含まれない

### Requirement: 不足カラートークンが globals.css に追加される

`--bg-info`, `--bg-success-light`, `--border-success-light`, `--text-sidebar-muted` をライトモードの `:root` と `@theme inline` に追加する MUST。ダークモード値は追加しない SHALL。

#### Scenario: 新規カラートークンが :root に定義される

**Given** `src/app/globals.css` の `:root` ブロックを確認する
**When** カラートークンを見る
**Then** `--bg-info: #eef5fb`、`--bg-success-light: #eef7f1`、`--border-success-light: #cde6d8`、`--text-sidebar-muted: #7f95a8` が定義されている

#### Scenario: 新規カラートークンが @theme inline に登録される

**Given** `src/app/globals.css` の `@theme inline` ブロックを確認する
**When** カラートークンを見る
**Then** `--color-bg-info`, `--color-bg-success-light`, `--color-border-success-light`, `--color-text-sidebar-muted` が定義されている

### Requirement: テストが変更後のスタイル値を正しくアサーションする

`uiBusinessStyle.test.ts` の TC-004 と TC-033 のアサーションを `rounded-none` → `rounded` に更新する MUST。`typecheck && test` が green である SHALL。

#### Scenario: TC-004 が rounded をアサーションする

**Given** `src/__tests__/static/uiBusinessStyle.test.ts` の TC-004 を確認する
**When** BTN_SUBMIT のアサーションを見る
**Then** `rounded` の存在をチェックし、`rounded-none` をチェックしていない

#### Scenario: TC-033 が rounded をアサーションする

**Given** `src/__tests__/static/uiBusinessStyle.test.ts` の TC-033 を確認する
**When** SELECT_BASE のアサーションを見る
**Then** `rounded` の存在をチェックし、`rounded-none` をチェックしていない
