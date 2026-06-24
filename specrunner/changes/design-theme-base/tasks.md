# Tasks: Tailwind テーマ基盤の更新とサイドバーレイアウトへの移行

## T-01: globals.css にカラートークンとカスタムフォントサイズを追加する

- [ ] `:root` ブロックに以下のカラートークンを追加する:
  - `--bg-info: #eef5fb`
  - `--bg-success-light: #eef7f1`
  - `--border-success-light: #cde6d8`
  - `--text-sidebar-muted: #7f95a8`
- [ ] `@theme inline` ブロックに以下の Tailwind カラートークンを追加する:
  - `--color-bg-info: var(--bg-info)`
  - `--color-bg-success-light: var(--bg-success-light)`
  - `--color-border-success-light: var(--border-success-light)`
  - `--color-text-sidebar-muted: var(--text-sidebar-muted)`
- [ ] `@theme inline` ブロックに以下のカスタムフォントサイズを追加する:
  - `--text-2xs: 0.625rem` + `--text-2xs--line-height: 1.4`
  - `--text-table-head: 0.6875rem` + `--text-table-head--line-height: 1.4`
  - `--text-base-app: 0.78125rem` + `--text-base-app--line-height: 1.5`
  - `--text-body: 0.8125rem` + `--text-body--line-height: 1.5`
- [ ] `@theme inline` ブロックの `--font-sans` を `var(--font-noto-sans-jp)` に変更する
- [ ] `@theme inline` ブロックの `--font-mono` を `var(--font-ibm-plex-mono)` に変更する
- [ ] body スタイルの `font-family: Arial, Helvetica, sans-serif` を削除する（Tailwind の `--font-sans` が適用されるため不要）
- [ ] body スタイルに `font-size: 13px` を追加する
- [ ] ダークモード（`[data-theme="dark"]`）ブロックには新規カラートークンを追加しない（スコープ外）

**Acceptance Criteria**:
- `:root` に 4 つの新規カラートークンが定義されている
- `@theme inline` に 4 つの新規カラートークンと 4 つのカスタムフォントサイズが定義されている
- `--font-sans` / `--font-mono` が新フォントの CSS 変数を参照している
- body の font-size が 13px で、font-family の直接指定が削除されている

## T-02: layout.tsx のフォントインポートを変更する

- [ ] `src/app/layout.tsx` の `Geist`, `Geist_Mono` インポートを削除する
- [ ] `Noto_Sans_JP` を `next/font/google` からインポートする。設定: `variable: "--font-noto-sans-jp"`, `subsets: ["latin"]`, `weight: ["400", "500", "700"]`
- [ ] `IBM_Plex_Mono` を `next/font/google` からインポートする。設定: `variable: "--font-ibm-plex-mono"`, `subsets: ["latin"]`, `weight: ["400", "500"]`
- [ ] html タグの className に設定する CSS 変数名を新フォントのものに更新する
- [ ] 旧変数名（`geistSans`, `geistMono`）を新変数名に変更する

**Acceptance Criteria**:
- `Geist` / `Geist_Mono` のインポートが存在しない
- `Noto_Sans_JP` / `IBM_Plex_Mono` がインポートされている
- html タグの className に新フォントの CSS 変数が設定されている

## T-03: styles.ts の定数を更新する

- [ ] `INPUT_BASE`: `rounded-none` → `rounded`、`px-2 py-1` → `px-2.5 py-1.5` に変更する
- [ ] `SELECT_BASE`: `rounded-none` → `rounded`、`px-2 py-1` → `px-2.5 py-1.5` に変更する
- [ ] `BTN_SUBMIT`: `rounded-none` → `rounded`、`px-3 py-1` → `px-3.5 py-1.5` に変更する。`font-medium` を追加する
- [ ] `SECTION_CARD`: `border-border-light` → `border-border` に変更する。`rounded shadow-sm` を追加する

**Acceptance Criteria**:
- INPUT_BASE / SELECT_BASE に `rounded` と `px-2.5 py-1.5` が含まれている
- BTN_SUBMIT に `rounded`、`px-3.5 py-1.5`、`font-medium` が含まれている
- SECTION_CARD に `border-border`、`rounded`、`shadow-sm` が含まれている
- `rounded-none` が styles.ts に存在しない

## T-04: FormField.tsx の Input / Select / Textarea を更新する

- [ ] `Input` コンポーネント: `rounded-none` → `rounded`、`px-2 py-1` → `px-2.5 py-1.5` に変更する
- [ ] `Select` コンポーネント: `rounded-none` → `rounded`、`px-2 py-1` → `px-2.5 py-1.5` に変更する
- [ ] `Textarea` コンポーネント: `rounded-none` → `rounded`、`px-2 py-1` → `p-2.5` に変更する

**Acceptance Criteria**:
- Input / Select に `rounded` と `px-2.5 py-1.5` が含まれている
- Textarea に `rounded` と `p-2.5` が含まれている
- `rounded-none` が FormField.tsx に存在しない

## T-05: SectionCard.tsx を更新する

- [ ] `border-border-light` を `border-border` に変更する
- [ ] `rounded` を追加する
- [ ] `shadow-sm` を追加する

**Acceptance Criteria**:
- className に `border-border`、`rounded`、`shadow-sm` が含まれている
- `border-border-light` が SectionCard.tsx に存在しない

## T-06: LinkButton.tsx の SubmitButton を更新する

- [ ] `rounded-none` → `rounded` に変更する
- [ ] `px-3 py-1` → `px-3.5 py-1.5` に変更する
- [ ] `font-medium` を className に追加する

**Acceptance Criteria**:
- SubmitButton に `rounded`、`px-3.5 py-1.5`、`font-medium` が含まれている
- `rounded-none` が LinkButton.tsx に存在しない

## T-07: MoneyInput.tsx を更新する

- [ ] `baseClass` の `rounded-none` → `rounded` に変更する
- [ ] `px-2 py-1` → `px-2.5 py-1.5` に変更する

**Acceptance Criteria**:
- baseClass に `rounded` と `px-2.5 py-1.5` が含まれている
- `rounded-none` が MoneyInput.tsx に存在しない

## T-08: MarkdownTextarea.tsx を更新する

- [ ] 編集モードの textarea の `rounded-none` → `rounded` に変更する（注: `border-t-0` との組み合わせに留意。タブとの接続部分で角丸が不要な場合は `rounded-b` に調整する）
- [ ] `px-2 py-1` → `p-2.5` に変更する

**Acceptance Criteria**:
- textarea に `rounded`（または `rounded-b`）が含まれ、`rounded-none` が含まれない
- padding が `p-2.5` に変更されている

## T-09: DataTable.tsx を更新する

- [ ] ヘッダー行（th）: `px-1 py-1.5 text-xs` → `px-3.5 py-2 text-table-head` に変更する。`font-bold` → `font-medium` に変更する
- [ ] データ行（td）: `px-1 py-1 text-xs` → `px-3.5 py-2.5 text-base-app` に変更する
- [ ] データ行（tr）: `border border-border-light` → `border-b border-border-light` に変更する（行ごとの下ボーダーのみにする）
- [ ] ヘッダー行（tr）: `border border-border-table-head` は維持する
- [ ] 非クリック行の hover はそのまま `hover:bg-bg-surface-alt` を維持する。クリック可能行の hover は `hover:bg-primary/10` を維持する

**Acceptance Criteria**:
- th に `px-3.5 py-2 text-table-head font-medium` が含まれている
- td に `px-3.5 py-2.5 text-base-app` が含まれている
- データ行の tr に `border-b border-border-light` が含まれている（四辺ボーダーではない）

## T-10: ダッシュボード layout.tsx をサイドバーレイアウトに変更する

- [ ] 既存の `<header>` + 横ナビ構造を、`<div className="flex min-h-screen">` をルートとするサイドバー + メインコンテンツ構造に書き換える
- [ ] サイドバー（`<aside>`）を実装する:
  - 幅: `w-[210px] min-w-[210px]`
  - 背景: `bg-bg-header`
  - レイアウト: `flex flex-col` で高さ全体を使う（`h-screen sticky top-0`）
  - ロゴエリア: 上部に padding 付きで配置。「Clearflow」（`text-[15px] font-bold text-white`）と「案件管理」（`text-2xs text-text-sidebar-muted`）を縦並び
- [ ] ナビゲーションを実装する:
  - `<nav className="flex-1 overflow-y-auto">` で縦スクロール可能に
  - 各リンク: `block px-4 py-2 text-sm text-text-on-dark-secondary hover:bg-white/6`
  - active 状態: `bg-white/10 text-white border-l-2 border-white`（active 判定は実装時に `usePathname` で実装）
  - 「申請一覧」の横に承認バッジの表示位置を確保する（初期状態では件数非表示）
  - 管理者メニュー（設定、監査ログ）は `isAdmin` 条件で表示する（既存ロジック維持）
- [ ] ユーザー情報エリアをサイドバー下部に配置する:
  - `border-t border-white/10` で区切る
  - ユーザー名 + ロール: `text-xs text-text-on-dark-disabled`
  - ThemeToggle コンポーネントを配置する
  - ログアウトボタン（既存の form + signOut action）を配置する
- [ ] メインコンテンツ領域を実装する:
  - `<main className="flex-1 overflow-y-auto bg-bg-page">` でスクロール可能に
  - 内側に `<div style={{ maxWidth: 1260 }} className="mx-auto px-7 pt-[22px] pb-14">` でコンテンツを制約する
- [ ] ナビゲーションの active 状態判定のため、コンポーネントを Client Component に分離する必要がある場合は `SidebarNav.tsx` を新規作成する（`usePathname` は Client Component でのみ使用可能）
- [ ] 既存の `ThemeToggle` インポートを維持する

**Acceptance Criteria**:
- サイドバーが左側 210px に表示される（`bg-bg-header`）
- ロゴエリアに「Clearflow」（15px, bold, 白）と「案件管理」（10px, #7f95a8）が表示される
- ナビリンクが縦並びで表示される
- ユーザー情報がサイドバー下部に表示される
- ThemeToggle とログアウトがサイドバー下部に配置されている
- メインコンテンツが max-width 1260px で padding 22px 28px 56px（上/左右/下）
- 既存の全ナビリンク（ダッシュボード〜監査ログ）がサイドバーに移行されている

## T-11: テストのアサーション値を更新する

- [ ] `src/__tests__/static/uiBusinessStyle.test.ts` の TC-004: `expect(content).toContain("rounded-none")` → `expect(content).toContain("rounded")` に変更する。`toContain("rounded")` は `rounded-none` にもマッチするため、`rounded-none` が存在しないことの否定アサーション `expect(content).not.toContain("rounded-none")` も追加する
- [ ] TC-033: 同様に `expect(content).toContain("rounded-none")` → `expect(content).toContain("rounded")` に変更し、`expect(content).not.toContain("rounded-none")` を追加する
- [ ] TC-004 のコメント行 `bg-primary・text-white・rounded-none を含む` を `bg-primary・text-white・rounded を含む` に更新する
- [ ] TC-033 のコメント行 `block w-full border border-border rounded-none を含む` を `block w-full border border-border rounded を含む` に更新する

**Acceptance Criteria**:
- TC-004 が `rounded` の存在と `rounded-none` の不在をアサーションしている
- TC-033 が `rounded` の存在と `rounded-none` の不在をアサーションしている
- テストの説明コメントが更新されている

## T-12: 最終検証

- [ ] `bun run typecheck` が green であることを確認する
- [ ] `bun test` が全て pass することを確認する（特に TC-004, TC-033）
- [ ] `rounded-none` が `src/` 配下に存在しないことを grep で確認する（テストのコメント行を除く）

**Acceptance Criteria**:
- `bun run typecheck` が exit 0 で完了する
- `bun test` が全テスト pass する
- `rounded-none` がソースコードに残存していない
