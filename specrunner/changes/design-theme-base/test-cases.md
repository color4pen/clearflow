# Test Cases: Tailwind テーマ基盤の更新とサイドバーレイアウトへの移行

## Summary

- **Total**: 38 cases
- **Automated** (unit/integration): 31
- **Manual**: 7
- **Priority**: must: 28, should: 9, could: 1

---

## フォント変更

### TC-001: layout.tsx が Noto Sans JP と IBM Plex Mono をインポートする

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: フォントが Noto Sans JP / IBM Plex Mono で表示される > Scenario: layout.tsx が Noto Sans JP と IBM Plex Mono をインポートする

---

### TC-002: Tailwind テーマの font-sans / font-mono が新フォントを参照する

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: フォントが Noto Sans JP / IBM Plex Mono で表示される > Scenario: Tailwind テーマの font-sans / font-mono が新フォントを参照する

---

### TC-003: body のベースフォントサイズが 13px である

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: フォントが Noto Sans JP / IBM Plex Mono で表示される > Scenario: body のベースフォントサイズが 13px である

---

### TC-004: body の font-family 直接指定が削除されている

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-01

**GIVEN** `src/app/globals.css` の body スタイルを確認する  
**WHEN** font-family の記述を検索する  
**THEN** `Arial, Helvetica, sans-serif` などの直接指定が存在せず、`--font-sans` CSS 変数経由でフォントが適用される状態になっている

---

## カスタムフォントサイズユーティリティ

### TC-005: text-2xs が 10px / line-height 1.4 で定義される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: カスタムフォントサイズユーティリティが Tailwind テーマに定義される > Scenario: text-2xs が 10px / line-height 1.4 で定義される

---

### TC-006: text-table-head が 11px / line-height 1.4 で定義される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: カスタムフォントサイズユーティリティが Tailwind テーマに定義される > Scenario: text-table-head が 11px / line-height 1.4 で定義される

---

### TC-007: text-base-app が 12.5px / line-height 1.5 で定義される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: カスタムフォントサイズユーティリティが Tailwind テーマに定義される > Scenario: text-base-app が 12.5px / line-height 1.5 で定義される

---

### TC-008: text-body が 13px / line-height 1.5 で定義される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: カスタムフォントサイズユーティリティが Tailwind テーマに定義される > Scenario: text-body が 13px / line-height 1.5 で定義される

---

## 角丸変更

### TC-009: FormField の入力要素が rounded を持つ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 全コンポーネントの角丸が rounded（4px）に統一される > Scenario: FormField の入力要素が rounded を持つ

---

### TC-010: styles.ts の定数が rounded を持つ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 全コンポーネントの角丸が rounded（4px）に統一される > Scenario: styles.ts の定数が rounded を持つ

---

### TC-011: MoneyInput が rounded を持つ

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 全コンポーネントの角丸が rounded（4px）に統一される > Scenario: MoneyInput が rounded を持つ

---

### TC-012: MarkdownTextarea が rounded を持つ

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-08

**GIVEN** `src/app/components/MarkdownTextarea.tsx` の編集モード textarea を確認する  
**WHEN** className の角丸クラスを確認する  
**THEN** `rounded`（または `rounded-b`）が含まれ、`rounded-none` が含まれない。また padding が `p-2.5` に変更されている

---

### TC-013: FormField の Textarea が rounded と p-2.5 を持つ

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-04

**GIVEN** `src/app/components/FormField.tsx` の Textarea コンポーネントを確認する  
**WHEN** className を確認する  
**THEN** `rounded` が含まれ、`rounded-none` が含まれない。padding が `p-2.5` になっている

---

### TC-014: SubmitButton の padding と font-weight が更新される

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-06

**GIVEN** `src/app/components/LinkButton.tsx` の SubmitButton className を確認する  
**WHEN** padding、角丸、font-weight のクラスを確認する  
**THEN** `rounded`、`px-3.5 py-1.5`、`font-medium` が含まれ、`rounded-none` が含まれない

---

### TC-015: src/ 配下に rounded-none が残存しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** 変更後の `src/` ディレクトリを対象に grep を実行する  
**WHEN** `rounded-none` をキーワードに検索する（テストファイルのコメント行を除外）  
**THEN** ヒット件数が 0 である

---

## SectionCard スタイル

### TC-016: SectionCard にボーダー、角丸、シャドウがある

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: SectionCard がデザイン仕様のスタイルを持つ > Scenario: SectionCard にボーダー、角丸、シャドウがある

---

### TC-017: styles.ts の SECTION_CARD が更新されている

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: SectionCard がデザイン仕様のスタイルを持つ > Scenario: styles.ts の SECTION_CARD が更新されている

---

## サイドバーレイアウト

### TC-018: サイドバーが左側 210px に表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ダッシュボードがサイドバーレイアウトで表示される > Scenario: サイドバーが左側 210px に表示される

---

### TC-019: サイドバーにロゴが表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ダッシュボードがサイドバーレイアウトで表示される > Scenario: サイドバーにロゴが表示される

---

### TC-020: ナビゲーションリンクがサイドバーに縦並びで表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ダッシュボードがサイドバーレイアウトで表示される > Scenario: ナビゲーションリンクがサイドバーに縦並びで表示される

---

### TC-021: ユーザー情報がサイドバー下部に表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ダッシュボードがサイドバーレイアウトで表示される > Scenario: ユーザー情報がサイドバー下部に表示される

---

### TC-022: メインコンテンツが max-width 1260px で表示される

**Category**: manual  
**Priority**: must  
**Source**: spec.md > Requirement: ダッシュボードがサイドバーレイアウトで表示される > Scenario: メインコンテンツが max-width 1260px で表示される

---

### TC-023: ThemeToggle とログアウトがサイドバー下部に配置されている

**Category**: unit  
**Priority**: should  
**Source**: design.md > D4: ThemeToggle とログアウトをサイドバー下部に配置する / tasks.md > T-10

**GIVEN** `src/app/(dashboard)/layout.tsx`（または SidebarNav.tsx）を確認する  
**WHEN** サイドバー下部のユーザー情報エリアを確認する  
**THEN** `ThemeToggle` コンポーネントとログアウト用 `<form>` / `signOut` アクションがサイドバー下部に配置されており、旧横ナビヘッダーには含まれていない

---

### TC-024: 管理者メニューが isAdmin 条件で表示される

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/layout.tsx`（または SidebarNav.tsx）のナビゲーションレンダリングを確認する  
**WHEN** 設定・監査ログリンクの条件分岐ロジックを確認する  
**THEN** `isAdmin` フラグの条件付きレンダリングで制御されており、既存ロジックが維持されている

---

### TC-025: アクティブなナビアイテムが bg-white/10 + 白文字 + 左ボーダーで表示される

**Category**: unit  
**Priority**: should  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/layout.tsx`（または SidebarNav.tsx）のナビアイテム className ロジックを確認する  
**WHEN** active 状態の条件分岐を確認する  
**THEN** `usePathname` でパスを判定し、active 時に `bg-white/10 text-white border-l-2 border-white` が適用される実装になっている

---

### TC-026: 横ナビバー（header）の構造が存在しない

**Category**: unit  
**Priority**: must  
**Source**: tasks.md > T-10

**GIVEN** `src/app/(dashboard)/layout.tsx` を確認する  
**WHEN** ファイルの JSX 構造を確認する  
**THEN** 旧来の `<header>` + 横ナビバー構造が削除されており、`<aside>` サイドバー + `<main>` のフレックスレイアウトに置き換わっている

---

## DataTable スタイル

### TC-027: ヘッダー行のスタイルが更新される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: DataTable のスタイルがデザイン仕様に合致する > Scenario: ヘッダー行のスタイルが更新される

---

### TC-028: データ行のスタイルが更新される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: DataTable のスタイルがデザイン仕様に合致する > Scenario: データ行のスタイルが更新される

---

### TC-029: 行区切りが border-b で表示される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: DataTable のスタイルがデザイン仕様に合致する > Scenario: 行区切りが border-b で表示される

---

### TC-030: クリック可能行の hover が bg-primary/10 を維持する

**Category**: unit  
**Priority**: should  
**Source**: design.md > D6: DataTable の hover をクリック可否で分岐維持する / tasks.md > T-09

**GIVEN** `src/app/components/DataTable.tsx` のデータ行レンダリングを確認する  
**WHEN** クリック可能行（onRowClick が指定された行）の className を確認する  
**THEN** `hover:bg-primary/10` が適用されており、非クリック行の `hover:bg-bg-surface-alt` と明確に分岐している

---

## カラートークン

### TC-031: 新規カラートークンが :root に定義される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 不足カラートークンが globals.css に追加される > Scenario: 新規カラートークンが :root に定義される

---

### TC-032: 新規カラートークンが @theme inline に登録される

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: 不足カラートークンが globals.css に追加される > Scenario: 新規カラートークンが @theme inline に登録される

---

### TC-033: ダークモードブロックに新規カラートークンが追加されていない

**Category**: unit  
**Priority**: should  
**Source**: design.md > D7: 新規カラートークンはダークモード値なしで追加する / tasks.md > T-01

**GIVEN** `src/app/globals.css` の `[data-theme="dark"]` ブロックを確認する  
**WHEN** 新規カラートークン（`--bg-info`, `--bg-success-light`, `--border-success-light`, `--text-sidebar-muted`）を検索する  
**THEN** これらのトークンがダークモードブロック内に存在しない（ライトモード定義のみ）

---

## テスト整合性

### TC-034: TC-004 が rounded をアサーションする

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: テストが変更後のスタイル値を正しくアサーションする > Scenario: TC-004 が rounded をアサーションする

---

### TC-035: TC-033 が rounded をアサーションする

**Category**: unit  
**Priority**: must  
**Source**: spec.md > Requirement: テストが変更後のスタイル値を正しくアサーションする > Scenario: TC-033 が rounded をアサーションする

---

### TC-036: TC-004 と TC-033 のコメント行が rounded に更新されている

**Category**: unit  
**Priority**: could  
**Source**: tasks.md > T-11

**GIVEN** `src/__tests__/static/uiBusinessStyle.test.ts` の TC-004 と TC-033 を確認する  
**WHEN** テストケースの説明コメントを確認する  
**THEN** `rounded-none` への言及が `rounded` に更新されており、コードの期待値と説明が一致している

---

## ビルド検証

### TC-037: bun run typecheck が exit 0 で完了する

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** 変更後のコードベースを用意する  
**WHEN** `bun run typecheck` を実行する  
**THEN** TypeScript の型エラーがなく exit 0 で完了する

---

### TC-038: bun test が全テスト pass する

**Category**: manual  
**Priority**: must  
**Source**: tasks.md > T-12

**GIVEN** 変更後のコードベースを用意する  
**WHEN** `bun test` を実行する  
**THEN** 全テスト（特に TC-004, TC-033）が pass し、失敗ゼロで完了する

---

## Result

```yaml
result: completed
total: 38
automated: 31
manual: 7
must: 28
should: 9
could: 1
blocked_reasons: []
```
