# Tailwind テーマ基盤の更新とサイドバーレイアウトへの移行

## Meta

- **type**: spec-change
- **slug**: design-theme-base
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: スタイリングの変更。構造的な設計判断なし → false -->

## 背景

Claude Design で作成した画面デザイン（docs/design/Clearflow.dc.html）を Tailwind テーマベースで実装に反映する。本リクエストではテーマ基盤（フォント、角丸、間隔）の更新と、横ナビからサイドバーへのレイアウト構造変更を行う。後続の画面別適用リクエスト（D02〜D12）の前提となる。

## 現状コードの前提

- `src/app/layout.tsx:2,5-8` — Geist / Geist_Mono フォントを next/font/google でインポート。デザインでは Noto Sans JP + IBM Plex Mono
- `src/app/globals.css:116` — body の font-family が `Arial, Helvetica, sans-serif`
- `src/app/globals.css:93-111` — `@theme inline` で Tailwind カスタムテーマを定義。`--font-sans: var(--font-geist-sans)`
- `src/app/(dashboard)/layout.tsx:19-106` — 横ナビバー（header）構造。サイドバーなし。max-width: 1200px。px-2 py-2
- `src/app/components/FormField.tsx:30,43,52` — 全入力要素に `rounded-none`
- `src/app/components/SectionCard.tsx:10` — `border-border-light`（#e0e0e0）、角丸なし、シャドウなし
- `src/app/components/DataTable.tsx:35,54` — テーブルの padding が px-1 py-1（4px）。フォントサイズ text-xs
- `src/app/components/LinkButton.tsx:43` — SubmitButton に `rounded-none`、py-1

## 要件

1. **フォント変更**: Geist / Geist_Mono を Noto Sans JP / IBM Plex Mono に置き換える。`src/app/layout.tsx` の next/font/google インポートを変更し、globals.css の `--font-sans` / `--font-mono` を更新する。body のベースフォントサイズを 13px に設定する
2. **Tailwind カスタムユーティリティの追加**: globals.css に以下のカスタムフォントサイズユーティリティを追加する。`text-2xs`（10px）、`text-table-head`（11px）、`text-base-app`（12.5px）、`text-body`（13px）。Tailwind 4 の `@utility` ディレクティブまたは `@theme inline` で定義する
3. **角丸の変更**: 全コンポーネントの `rounded-none` を `rounded`（4px）に変更する。FormField の入力要素、LinkButton の SubmitButton、SectionCard
4. **SectionCard の更新**: border を `border-border`（#cccccc）に変更。`rounded`（4px）を追加。`shadow-sm`（box-shadow: 0 1px 2px rgba(44,62,80,0.06) 相当）を追加
5. **FormField の padding 更新**: input / select を `px-2.5 py-1.5`（10px 6px）に変更。textarea を `p-2.5`（10px）に変更
6. **ボタンの padding 更新**: SubmitButton を `px-3.5 py-1.5`（14px 6px → デザインの 13px 7px に近似）に変更。font-weight を `font-medium`（500）に変更
7. **サイドバーレイアウトへの移行**: `src/app/(dashboard)/layout.tsx` を横ナビから縦サイドバーに構造変更する
   - サイドバー: width 210px、background #2c3e50（bg-bg-header）、縦方向 flex
   - ロゴ: 「Clearflow」（15px, bold, white）+ 「案件管理」（10px, #7f95a8）
   - ナビアイテム: テキストラベルのみ（アイコンなし）。active 状態は bg-white/10 + 白文字 + 左ボーダー。hover は bg-white/6
   - 承認バッジ: 未対応件数を表示
   - ユーザー情報: サイドバー下部に名前 + ロール
   - メインコンテンツ: flex:1、overflow-y:auto、max-width 1260px、padding 22px 28px 56px
8. **DataTable の更新**: ヘッダー行を `px-3.5 py-2 text-table-head font-medium` に変更。データ行を `px-3.5 py-2.5 text-base-app` に変更。行の下ボーダーを `border-b border-border-light` に変更。hover を `hover:bg-bg-surface-alt` に変更
9. **不足カラートークンの追加**: globals.css に以下を追加
   - `--bg-info`: #eef5fb（情報バナー背景）
   - `--bg-success-light`: #eef7f1（成功バナー背景）
   - `--border-success-light`: #cde6d8（成功バナーボーダー）
   - `--text-sidebar-muted`: #7f95a8（サイドバーのサブテキスト）

## スコープ外

- 各画面の個別レイアウト調整（D02〜D12 で実施）
- ダークモードのカラートークン更新（テーマ変更に追従させるが網羅的な調整は別途）
- レスポンシブ対応

## 受け入れ基準

- [ ] フォントが Noto Sans JP / IBM Plex Mono で表示される
- [ ] body のベースフォントサイズが 13px
- [ ] 入力要素の角丸が 3〜4px
- [ ] SectionCard にボーダー（#cccccc）、角丸、軽いシャドウがある
- [ ] サイドバーが左側 210px に表示される
- [ ] サイドバーにロゴ、ナビ、ユーザー情報が表示される
- [ ] メインコンテンツが max-width 1260px で中央寄せされている
- [ ] DataTable のヘッダーが 11px / データ行が 12.5px で表示される
- [ ] 既存の全ページが横ナビからサイドバーレイアウトに切り替わっている
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **D01 にレイアウト変更を含める** — テーマ変更とレイアウト変更を分離すると、中間状態（新テーマ + 旧レイアウト）で見た目が崩れる。1 リクエストで一括適用する方が整合性が高い。却下案: テーマとレイアウトを分離 — 中間状態のビジュアル崩れが発生する
2. **カスタムフォントサイズユーティリティを追加** — デザインが 10px / 11px / 12.5px / 13px を多用しており、Tailwind のデフォルト（text-xs: 12px, text-sm: 14px）では表現できない。`@theme inline` で追加する。却下案: インラインスタイルで対応 — Tailwind の統一性が崩れる
