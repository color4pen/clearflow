# Design: 業務システムUIを全ページに展開

## Context

申請一覧ページ (`requests/page.tsx`, `BulkApprovalPanel.tsx`) とダッシュボードレイアウト (`layout.tsx`) には業務システムスタイルが適用済み。残りの全ページ（申請詳細、申請作成、ログイン、設定系全ページ）は旧スタイル（角丸、影、塗りボタン）のまま。

共通スタイル定数 `styles.ts` の `BTN_PRIMARY`, `BTN_DANGER`, `INPUT_BASE`, `SELECT_BASE` 等が旧スタイル値のため、これらを import しているコンポーネントはすべて旧スタイルで描画される。

対象ファイル数: 18ファイル（styles.ts 含む）

## Goals / Non-Goals

**Goals**:

- 全ページに業務システムスタイルを適用し、視覚的に統一する
- `styles.ts` の共通定数を業務システムスタイルに更新する
- 旧スタイル（rounded-md, rounded-lg, shadow-sm, shadow-md, shadow, bg-blue-600）を全ファイルから除去する
- `font-mono` をデータ表示箇所から除去し、sans-serif に統一する

**Non-Goals**:

- レスポンシブ対応
- ダークモード対応
- アイコン追加
- 機能追加・変更（振る舞いの変更なし）

## Decisions

### D1: styles.ts を拡張して共通パターンを定数化する

**Rationale**: 旧 `BTN_PRIMARY` 等は塗りボタンだったが、業務システムではテキストリンクが主操作。ただしフォーム送信ボタンのみ最小限の塗りボタンを許容する（architect 判断 #2）。これを `BTN_SUBMIT` として新設する。

既存定数を更新:
- `BTN_PRIMARY` → `text-[#2980b9] underline text-xs` (テキストリンク)
- `BTN_PRIMARY_DISABLED` → 同上 + `disabled:text-[#bdc3c7] disabled:no-underline`
- `BTN_SECONDARY` → `text-xs text-[#7f8c8d] underline`
- `BTN_DANGER` → `text-[#c0392b] underline text-xs`
- `BTN_SUCCESS` → `text-[#1a8a4a] underline text-xs`
- `BTN_WARNING` → `text-[#d35400] underline text-xs`
- `INPUT_BASE` → `w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none`
- `SELECT_BASE` → `block w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none`

新設定数:
- `BTN_SUBMIT` → `bg-[#2980b9] text-white text-xs px-3 py-1 rounded-none disabled:opacity-50 disabled:cursor-not-allowed` (フォーム送信専用)
- `TOOLBAR` → `bg-[#f5f5f5] border border-[#cccccc] px-2 py-1`
- `TABLE_HEADER_CELL` → `px-1 py-1.5 text-xs text-[#2c3e50] font-bold`
- `SECTION_CARD` → `bg-white border border-[#e0e0e0]`
- `FOOTER_BAR` → `bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-0.5 text-xs text-[#7f8c8d]`
- `LABEL` → `text-xs text-[#7f8c8d]`
- `FORM_LABEL` → `text-xs font-bold text-[#2c3e50]`

**Alternatives considered**: 各ファイルにインラインで記述する → 定数化のほうが変更時の一括対応が容易。

### D2: テーブルスタイルの統一パターン

全設定ページのテーブルを以下の統一パターンに変換する:
- `<table>` に `border-collapse` を適用
- `<thead>` は `bg-[#dcdde1] border border-[#bdc3c7]`、セルは `text-xs text-[#2c3e50] font-bold`
- `<tbody>` の行は偶数行 `bg-white`、奇数行 `bg-[#f9f9f9]`。`divide-y` は `border border-[#e0e0e0]` に置換
- `hover:bg-gray-50` → `hover:bg-[#eef2f7]`

**Rationale**: 申請一覧テーブルで確立済みのパターンをそのまま横展開。`divide-y` は border-collapse テーブルと相性が悪いため、行ごとの border に置換する。

### D3: 承認ステップ表示をリストからテーブルに変換する（申請詳細ページ）

現在の `ApprovalStepsSection` は `<ol>` + `<li>` + `rounded-md` カードのリスト表示。業務システムスタイルではテーブル形式に変換する。

列構成: No. | 承認者ロール | ステータス | 承認者名 | 処理日時 | 期限 | コメント

**Rationale**: テーブル形式は申請一覧と一貫しており、業務システムの視覚規則に合致する。

### D4: ログインページの背景をグレーに統一する

現在 `bg-gray-50` → `bg-[#e8e8e8]` に変更。カード部分は `bg-white border border-[#e0e0e0]` で影と角丸を除去。

**Rationale**: ダッシュボード側と同一の背景色を使用し、アプリ全体の統一感を保つ。

### D5: 設定ページのヘッダーをツールバー形式に変換する

現在の `<h1>text-2xl font-bold` + `<p>` の2行ヘッダーをツールバー形式（`bg-[#f5f5f5] border border-[#cccccc] px-2 py-1`）に変換。見出し `text-sm font-bold`、説明テキストは除去またはツールバー内に `text-xs` で統合。

**Rationale**: 申請一覧ページのツールバーパターンに統一する。

### D6: SettingsNav のスタイルを業務システムに合わせる

現在の `border-b border-gray-200` + `border-blue-600` アクティブスタイルを、`bg-[#f5f5f5] border border-[#cccccc]` ベースに変更。アクティブタブは `text-[#2c3e50] font-bold`、非アクティブは `text-[#7f8c8d]`。

### D7: font-mono の除去

Webhook URL、Secret、ユーザーID、監査ログの action 等で使われている `font-mono` をすべて除去する。デザインルールにより sans-serif 統一。

### D8: ステータスバッジのスタイル統一

Webhook・代理承認ページの「有効/無効」バッジ（`bg-green-100 text-green-800` / `bg-gray-100 text-gray-600` + `rounded`）をテキスト表現に変換する。有効 = `text-[#1a8a4a] text-xs font-bold`、無効 = `text-[#95a5a6] text-xs`。

**Rationale**: 角丸バッジは業務システムスタイルに不適合。テキストのみで状態を表現する。

## Risks / Trade-offs

- [Risk] styles.ts の定数変更が import 先すべてに波及する → [Mitigation] 全 import 先を本タスクで同時に更新するため整合性は保たれる。`BTN_PRIMARY` がテキストリンクになるため、`className` 結合部分でレイアウト崩れがないか全箇所を確認する
- [Risk] ステータスバッジの角丸除去で視認性が下がる → [Mitigation] テキスト色とフォントウェイトで補完する。機能的な変更ではないため UX 面のリスクは低い
- [Risk] 変更ファイル数が多い（18ファイル）ためコンフリクトの可能性 → [Mitigation] main から一括変更で対応。他の進行中 request との共有ファイルは styles.ts のみ

## Open Questions

なし（architect 判断で設計方針は確定済み）
