# Design: Tailwind テーマ基盤の更新とサイドバーレイアウトへの移行

## Context

Clearflow の UI はデフォルト Tailwind テーマ（Geist フォント、12px ベース）と横ナビバーで構築されている。画面デザインに合わせて、テーマ基盤（フォント、角丸、間隔、カラートークン）の更新と、横ナビからサイドバーへのレイアウト構造変更を一括で行う。本変更は後続の画面別適用リクエスト（D02〜D12）の前提となる。

現状コードの構造:

- `src/app/layout.tsx` — Geist / Geist_Mono フォントを next/font/google でインポート。CSS 変数 `--font-geist-sans` / `--font-geist-mono` を設定
- `src/app/globals.css` — `@theme inline` で Tailwind カスタムテーマを定義。`--font-sans: var(--font-geist-sans)` / `--font-mono: var(--font-geist-mono)`。body の font-family は `Arial, Helvetica, sans-serif`
- `src/app/(dashboard)/layout.tsx` — 横ナビバー（header + nav）、max-width 1200px
- `src/app/(dashboard)/styles.ts` — 再利用スタイル定数（INPUT_BASE, SELECT_BASE, BTN_SUBMIT, SECTION_CARD 等）。`rounded-none` を含む
- `src/app/components/` — FormField（Input, Select, Textarea）、SectionCard、DataTable、LinkButton（SubmitButton）、MoneyInput、MarkdownTextarea。各所に `rounded-none`、`px-2 py-1`
- `src/__tests__/static/uiBusinessStyle.test.ts` — styles.ts の定数値を静的アサーションするテスト。TC-004 が `rounded-none` を期待、TC-033 が `rounded-none` を期待

## Goals / Non-Goals

**Goals**:

- フォントを Noto Sans JP / IBM Plex Mono に変更し、ベースフォントサイズを 13px にする
- デザインが要求するカスタムフォントサイズ（10px, 11px, 12.5px, 13px）を Tailwind テーマトークンとして定義する
- 全コンポーネントの角丸を `rounded-none` → `rounded`（4px）に統一する
- SectionCard にボーダー強化・角丸・シャドウを追加する
- フォーム要素・ボタンの padding をデザインに合わせる
- 横ナビバーをサイドバーレイアウトに構造変更する
- DataTable のスタイルをデザインに合わせる
- 不足カラートークンを追加する

**Non-Goals**:

- 各画面の個別レイアウト調整（D02〜D12 で実施）
- ダークモードの新規カラートークン値の定義（ライトモード値のみ追加し、ダークモード対応は後続）
- レスポンシブ対応
- 承認バッジの動的データ取得（サイドバー上の承認バッジ表示はプレースホルダーとし、データクエリ統合は後続リクエストで実施）

## Decisions

### D1: テーマ変更とレイアウト変更を同一リクエストで実施する

**選択**: フォント・角丸・間隔の変更とサイドバーレイアウト移行を 1 リクエストで一括実施する
**却下**: テーマとレイアウトを別リクエストに分離する

**Rationale**: 中間状態（新テーマ + 旧レイアウト）ではビジュアルの整合性が崩れる。一括適用により、ユーザーに一貫した見た目を提供できる。architect 評価済み。

### D2: カスタムフォントサイズを `@theme inline` で定義する

**選択**: globals.css の `@theme inline` ブロックに `--text-2xs`, `--text-table-head`, `--text-base-app`, `--text-body` を追加する。各サイズに `--line-height` も明示的に設定する（line-height 未指定時のデフォルト 1.5 は 10px テキストには大きすぎるため）
**却下**: インラインスタイルで個別対応する

**Rationale**: デザインが 10px / 11px / 12.5px / 13px を多用しており、Tailwind のデフォルト（text-xs: 12px, text-sm: 14px）ではカバーできない。テーマトークンとして定義することで Tailwind の統一性を維持する。architect 評価済み。

line-height の設定値:
- `text-2xs`（10px）: line-height 1.4（14px）
- `text-table-head`（11px）: line-height 1.4（15.4px）
- `text-base-app`（12.5px）: line-height 1.5（18.75px）
- `text-body`（13px）: line-height 1.5（19.5px）

### D3: styles.ts の定数とテストを同時に更新する

**選択**: styles.ts の `rounded-none` → `rounded`、padding 変更を行い、それに依存する `uiBusinessStyle.test.ts` の TC-004・TC-033 のアサーションも `rounded` に更新する
**却下**: テストを削除する

**Rationale**: テストは styles.ts の定数値を静的アサーションしている。定数値の変更に合わせてテストの期待値も更新するのが正しい。テストの目的（定数の存在と基本値の確認）は維持される。

### D4: ThemeToggle とログアウトをサイドバー下部に配置する

**選択**: サイドバー下部のユーザー情報エリアに ThemeToggle とログアウトボタンをまとめる。ユーザー名 + ロール表示の下にログアウトリンクと ThemeToggle を横並びで配置する
**却下**: ヘッダーから削除する（機能喪失）、メインコンテンツ側に移動する（発見性が下がる）

**Rationale**: request-review Finding #1 で指摘された通り、ThemeToggle とログアウトの配置先を明示する必要がある。サイドバー下部のユーザー情報エリアは自然な配置場所であり、既存 UI の機能を維持できる。

### D5: 承認バッジは静的プレースホルダーとする

**選択**: サイドバーの「申請一覧」ナビアイテム横にバッジ UI を用意するが、件数は固定値（0）で表示しない。動的な未対応件数取得は後続リクエストで実装する
**却下**: 本リクエストで DB クエリを追加して未対応件数を取得する

**Rationale**: request-review Finding #2 で指摘された通り、データクエリの設計はスコープ外。レイアウト構造として承認バッジの表示位置を確保しておき、後続で動的データを統合する。

### D6: DataTable の hover をクリック可否で分岐維持する

**選択**: クリック可能行は `hover:bg-primary/10`（既存）を維持し、非クリック行のみ `hover:bg-bg-surface-alt` を適用する
**却下**: 全行の hover を `hover:bg-bg-surface-alt` に統一する

**Rationale**: request-review Finding #3 で指摘された通り、クリック可能行は視覚的にクリッカブルであることを示す必要がある。既存の分岐ロジックを維持しつつ、非クリック行のみデザイン指定の hover に変更する。

### D7: 新規カラートークンはダークモード値なしで追加する

**選択**: `--bg-info`, `--bg-success-light`, `--border-success-light`, `--text-sidebar-muted` をライトモード（`:root`）のみに追加する。ダークモード値は定義しない
**却下**: ダークモードのおおよその値を推定して追加する

**Rationale**: request-review Finding #5 の通り、ダークモードのカラートークン更新はスコープ外として明示されている。推定値を入れると後続の調整で二重作業になる。

## Risks / Trade-offs

**[Risk]** styles.ts の定数変更に依存するテスト（TC-004, TC-033）が `rounded-none` → `rounded` の変更で失敗する
→ **Mitigation**: T-09 でテストのアサーション値を明示的に更新する。変更内容は定数値の期待値変更のみであり、テストの構造・目的は維持される。

**[Risk]** MoneyInput と MarkdownTextarea が FormField の Input/Select/Textarea を使わず独自にスタイルをハードコードしており、変更漏れのリスクがある
→ **Mitigation**: 全 `rounded-none` の出現箇所を Grep で事前に列挙し（6 ファイル確認済み）、漏れなくタスクに含める。

**[Risk]** サイドバーレイアウトへの移行で既存の全ページの表示が変わるため、予期しないレイアウト崩れが発生する可能性がある
→ **Mitigation**: メインコンテンツ領域の max-width を 1200px → 1260px に変更するのみで、ページ内部のレイアウトには手を入れない。個別調整は D02〜D12 で実施する。

**[Risk]** ダークモードで新規カラートークンがライトモード値のまま表示される
→ **Mitigation**: スコープ外として明示。後続リクエストで網羅的にダークモード対応を行う。

## Open Questions

なし — request-review の指摘事項は全て D4〜D7 の設計判断として解決済み。
