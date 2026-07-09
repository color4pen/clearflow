# Design: controls-tables-restyle

## Context

デザイントークン（ステータス 6 系統・slate 基調）は `globals.css` の `@theme inline` ブロックに定義済み。Tailwind v4 経由で `bg-primary`, `text-danger`, `bg-status-green-bg` 等のユーティリティとして利用可能。

**現状の問題点**:

1. **styles.ts のボタン定数が実態と乖離**: `BTN_PRIMARY` はリンクスタイル (`text-primary underline`) で定義されているが、ページ/セクションの主要操作は別途インラインで `bg-primary text-white` と書かれている。`BTN_SUCCESS` / `BTN_WARNING` / `BTN_SUBMIT` が並立し、意味の重複がある。
2. **生パレットの直書きが広範**: `bg-green-600`, `bg-blue-500`, `bg-gray-200`, `bg-amber-50`, `bg-red-50` 等が `(dashboard)` 配下の 20 超ファイルに存在し、ダークテーマで意図しない表示になる。
3. **DataTable に 2 種の hover 色**: クリック可能行は `hover:bg-primary/10`（青み）、不可行は `hover:bg-bg-surface-alt`。色味が統一されていない。
4. **期限強調なし**: タスク一覧・ActionItemRow の dueDate は素テキスト表示。期限切れ・当日が視覚的に区別できない。

**前提コード**:
- `src/app/(dashboard)/styles.ts`: ボタン定数（現行はリンク型）・INPUT_BASE・SELECT_BASE を定義。`BTN_PRIMARY` を import しているのは `UserDeactivateButton.tsx` のみ。
- 共有コンポーネント `Input` / `Select` / `Textarea` (`FormField.tsx`) と `SubmitButton` (`LinkButton.tsx`) は正しいトークン参照を持つ。
- `DataTable.tsx`: th に `text-text font-medium`、クリック可行に `hover:bg-primary/10`。
- `ActionItemRow.tsx`: `formatDueDate` は整形のみで強調なし。

## Goals / Non-Goals

**Goals**:
- `styles.ts` のボタン定数を 3 階層（PRIMARY / SECONDARY / DANGER）の塗りボタンとして再定義する
- `BTN_SUCCESS`, `BTN_WARNING`, `BTN_SUBMIT`, `BTN_PRIMARY_DISABLED` を廃止する
- `INPUT_BASE` / `SELECT_BASE` を共有コンポーネント相当のトークン参照に補完する
- `src/app/(dashboard)` 配下の生パレットクラス（`(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+`）を全廃する
- `DataTable` の行 hover を `hover:bg-bg-surface-alt` に統一し、th を `text-text-secondary` に変更する
- `dueDateClass(date, now?)` UI ヘルパーを新設してタスク一覧・ActionItemRow に適用する
- ユニットテスト・lint・typecheck・build green を維持する

**Non-Goals**:
- レイアウト変更（要素配置・順序・密度）
- ページネーション新設
- 新フィルタ・検索機能
- テーブル行内リンクアクションのボタン化
- `(auth)` / `(platform)` 配下の変更
- フォント・文字サイズスケールの変更

## Decisions

### D1: BTN_PRIMARY を塗りボタン化（breaking）

`BTN_PRIMARY` を `"bg-primary text-white text-xs font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"` に再定義する。`BTN_SECONDARY` は `"bg-bg-surface text-text text-xs font-medium rounded px-4 py-1.5 border border-border hover:bg-bg-surface-alt disabled:opacity-50"`、`BTN_DANGER` は `"bg-danger text-white text-xs font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-50"` とする。

現在 `BTN_PRIMARY` を import しているのは `UserDeactivateButton.tsx` のみ。再定義後は "有効化" = 塗り PRIMARY、"無効化" = 塗り DANGER になる。セクションレベルの操作として適切。

代替案: 旧 `BTN_PRIMARY` を残して `BTN_PRIMARY_FILLED` を追加 → 却下（命名混乱・移行コスト増）。

### D2: BTN_SUCCESS / BTN_WARNING / BTN_SUBMIT / BTN_PRIMARY_DISABLED の廃止

`BTN_SUBMIT` は `SubmitButton` コンポーネントと重複。`BTN_SUCCESS` / `BTN_WARNING` の import は存在しない（現在未使用）。廃止後も `UserDeactivateButton.tsx` が既存の `BTN_PRIMARY` / `BTN_DANGER` import を維持するため、コンパイルエラーは発生しない。

### D3: セクション内保存ボタン（`bg-green-600`）のトークン化

各セクションの inline edit 保存ボタンは `isDirty ? "bg-green-600 text-white cursor-pointer" : "..."` のような ternary クラスを持つ。これを `isDirty ? "bg-primary text-white cursor-pointer hover:opacity-90" : "..."` に変更する。BTN_PRIMARY 定数を import してしまうと ternary の可読性が落ちるため、インラインのままトークン参照のみ置換する（`hover:opacity-90` は optional で既存 hover 形式に合わせる）。

### D4: フォームレベル submit/cancel ボタンの統一

インライン `bg-primary text-white text-xs font-bold px-4 py-1.5` の submit ボタン → `SubmitButton` コンポーネントに統一（同等クラス持参）。キャンセルボタンは `BTN_SECONDARY` を styles.ts から import して適用する。`<Link>` 要素のキャンセルも className に `BTN_SECONDARY` を適用可能。

### D5: BulkApprovalPanel 結果アラートのトークン

| 種別 | 旧クラス | 新クラス |
|---|---|---|
| success | `bg-green-50 border-green-300 text-green-800` | `bg-bg-success-light border-border-success-light text-success` |
| error | `bg-red-50 border-red-300 text-red-800` | `bg-status-red-bg border-status-red-text/30 text-status-red-text` |
| partial | `bg-yellow-50 border-yellow-300 text-yellow-800` | `bg-bg-row-pending border-border-row-pending text-warning` |

### D6: InvoiceSection 進捗チャートのトークン

入金済（paid）セグメントは `bg-success`、請求済（invoiced）セグメントは `bg-primary`、残りのトラックは `bg-border` に置換する。凡例ドットも同じ置換を適用し、`border-gray-300` は `border-border` に置換する。

### D7: DealPhaseStepper 終端ボタンのトークン

| ボタン | 旧 | 新 |
|---|---|---|
| 受注にする | `border-green-600 text-green-700 hover:bg-green-50` | `border-status-green-text text-status-green-text hover:bg-status-green-bg` |
| 失注にする | `hover:bg-red-50`（border/text は danger トークン済み） | `hover:bg-status-red-bg` |
| 見送りにする | `border-gray-500 text-gray-600 hover:bg-gray-50` | `border-status-gray-text text-status-gray-text hover:bg-status-gray-bg` |

### D8: required asterisk のトークン化

フォームの必須マーカー `<span className="text-red-500">*</span>` は `text-danger` に統一する（同値だが light/dark で正しいトークン値に追従する）。

### D9: その他の生パレット置換

| ファイル | 旧 | 新 |
|---|---|---|
| `requests/[id]/SystemOriginBanner.tsx` | `bg-blue-50 border-blue-200 text-blue-500 text-blue-800` | `bg-bg-info border-status-blue-text/30 text-status-blue-text` |
| `contracts/[id]/page.tsx` | `bg-amber-50 border-amber-300 text-amber-800` | `bg-bg-row-pending border-border-row-pending text-warning` |
| `contracts/page.tsx` rowClass | `bg-amber-50` | `bg-bg-row-pending` |
| `NotificationPanel.tsx` バッジ | `bg-red-500 text-white` | `bg-danger text-white` |
| `revenue/forecast/page.tsx` | `bg-gray-200` bar track | `bg-border` |
| `revenue/page.tsx` | `bg-gray-100` bar track | `bg-bg-surface-alt` |
| `account/OAuthConnectionSection.tsx` | `text-gray-600` | `text-text-secondary` |
| `requests/[id]/ActionButtons.tsx` | `bg-white hover:bg-red-50` | `bg-bg-surface hover:bg-status-red-bg` |
| フォームフィードバック（成功） | `bg-green-50 border-green-200 text-green-800` | `bg-bg-success-light border-border-success-light text-success` |
| フォームフィードバック（エラー） | `bg-red-50 border-red-200` + text | `bg-status-red-bg border-status-red-text/30 text-status-red-text` |

### D10: `dueDateClass` ヘルパーの設計

シグネチャ: `dueDateClass(date: Date | string | null, now?: Date): string`

- `date` が null または未来日（`now` の暦日より後）→ `""` 返却
- `date` が当日（`now` と同じ暦日）→ `"text-warning font-semibold"`
- `date` が過去日（`now` の暦日より前）→ `"text-danger font-semibold"`
- `now` 省略時は `new Date()` を使用（テスト時に任意の Date を注入可能）
- 日付比較はローカルタイムの暦日単位（`toDateString()` による比較）

配置: `src/app/(dashboard)/lib/dueDateClass.ts`（`lib/` ディレクトリを新規作成）
テスト: `src/__tests__/dashboard/dueDateClass.test.ts`
適用先: `ActionItemRow.tsx` の両モード（showSource=true/false）の期日表示部分。

### D11: DataTable ヘッダー色と行 hover の統一

- th の `text-text font-medium` → `text-text-secondary font-medium`
- クリック可能行 `hover:bg-primary/10` → `hover:bg-bg-surface-alt`（非クリック可能行と統一）
- `cursor-pointer` はクリック可能行に残す。縞・padding・border は現行維持。

## Risks / Trade-offs

[Risk] `BTN_PRIMARY` の意味変更で `UserDeactivateButton` のボタン外観が塗りに変わる → 意図的な変更。セクションレベルの主要操作として適切。

[Risk] 生パレット置換の漏れ → タスク完了後に `grep -rE '(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+' src/app/\(dashboard\)` でゼロ件確認を acceptance criteria に含め、最終タスクで検証する。

[Risk] `dueDateClass` がサーバー側のタイムゾーンと異なるローカルタイムで比較される → 表示ヘルパーはクライアントレンダリング前提。`"use client"` コンポーネントから呼び出すため問題なし。

[Risk] `ActionItemRow` の期日欄が `font-mono whitespace-nowrap` クラスを持つため、`dueDateClass` が追加するクラスと競合しないか → `font-semibold` は mono と共存可能。`text-danger` / `text-warning` は文字色のみで whitespace・font-family に影響しない。

## Open Questions

なし（全項目を上記 D1〜D11 で決定済み）
