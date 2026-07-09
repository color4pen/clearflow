# 操作系とテーブルの再スタイル（ボタン階層・入力欄・期限表示の統一）

## Meta

- **type**: refactoring
- **slug**: controls-tables-restyle
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI 層内のスタイル統一であり、層構造・port/adapter の選択は無いため false -->

前提: デザイントークン（ステータス 6 系統・slate 基調のトークン値）が `src/app/globals.css` に定義済みであること（design-foundation 取り込み後の main を起点とする）。

## 背景

デザイントークンとステータスバッジは統一済みだが、操作系とテーブルに旧スタイルが残っている:

- **ボタンの階層が不明確**: 塗りボタン（`bg-primary` 直書き、27 ファイル）とリンク型アクション（`underline`、53 ファイル）が混在し、主要操作と補助操作の視覚的な区別が場当たり的。
- **Tailwind 生パレットの直書きが残存**: `requests/BulkApprovalPanel.tsx` の結果アラート（`bg-green-50` / `bg-red-50` / `bg-yellow-50` 等）、`contracts/[id]/InvoiceSection.tsx` の進捗チャート（`bg-green-500` / `bg-blue-500` / `bg-gray-200`）、`deals/[id]/DealPhaseStepper.tsx` の終端アクションボタン（`border-green-600 text-green-700 hover:bg-green-50` 等）、`requests/[id]/ActionButtons.tsx`（`hover:bg-red-50` 等）。これらはダークテーマで背景に馴染まない。
- **テーブルの行 hover が 2 種類**: `DataTable` はクリック可能行に `hover:bg-primary/10`（青み）、不可行に `hover:bg-bg-surface-alt` を使い分けており、色味が揃わない。
- **期限の強調がない**: タスク一覧・アクションアイテム行は期日（dueDate）を素のテキストで表示しており、期限切れ・当日が一覧で目に入らない。

## 決定事項

1. **挙動不変**: 画面遷移・Server Actions・API/MCP・DB・権限・集計に変更なし。変更は `src/app` 配下の表示（クラス・表示専用ロジック）のみ。
2. **レイアウト再配置はしない**: 要素の位置・順序・表示項目は現状維持（配置変更は別リクエスト）。
3. **行内・文中のテキストアクション（リンク型）は現状維持**。ボタン化するのはページ/セクションレベルの主要操作のみ。
4. **期限強調は文字色＋太字のみ**（行背景は変えない。既存の縞模様・行ハイライトと衝突させない）。
5. ライト/ダーク両対応（トークン参照のみで実現し、生パレット・hex 直書きを増やさない）。

## 現状コードの前提

- 共有クラス定数: `src/app/(dashboard)/styles.ts`（BTN_PRIMARY 等。ただし使用は各 1〜2 ファイルに留まり、実態は各ページのインラインクラス）。
- テーブル: `src/app/components/DataTable.tsx` に集約（th: `text-table-head text-text font-medium` / 縞: `bg-bg-surface` と `bg-bg-surface-alt` / hover: クリック可 `hover:bg-primary/10`・不可 `hover:bg-bg-surface-alt`）。
- 期限表示: `src/app/(dashboard)/tasks/`（タスクの dueDate）、`src/app/(dashboard)/components/ActionItemRow.tsx`（アクションアイテムの dueDate、`formatDueDate` で整形・強調なし。案件詳細と商談詳細の両方から使用）。
- ステータス系統トークン（`--color-status-*`）と `StatusBadge` は定義済み。

## 要件

### 1. ボタン階層の定義（`styles.ts` を正とする）

`styles.ts` の定数を以下に再定義し、**ページ/セクションレベルの主要操作**をこの 3 階層に統一する:

| 定数 | 用途 | クラス仕様 |
|---|---|---|
| `BTN_PRIMARY` | 主要操作（保存・送信・新規作成・確定） | `bg-primary text-white text-xs font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed` |
| `BTN_SECONDARY` | 同格の取消・戻る・補助操作 | `bg-bg-surface text-text text-xs font-medium rounded px-4 py-1.5 border border-border hover:bg-bg-surface-alt disabled:opacity-50` |
| `BTN_DANGER` | 破壊的操作の確定（削除する 等） | `bg-danger text-white text-xs font-medium rounded px-4 py-1.5 hover:opacity-90 disabled:opacity-50` |

- 旧 `BTN_SUCCESS` / `BTN_WARNING` は利用箇所を上記 3 階層のいずれかに寄せて廃止する（成功=PRIMARY、警告系=SECONDARY または DANGER、文脈で判断）。
- `BTN_SUBMIT` は `BTN_PRIMARY` に統合する。
- **リンク型のまま維持するもの**: テーブル行内のアクション、文中のリンク、PageToolbar 内の `[新規作成]` 等のブラケット表記リンク（表記・密度を変えない）。
- フォーム画面（新規作成・編集）の送信/取消ボタン行を PRIMARY / SECONDARY に統一する。削除確認ダイアログ/ボタンは DANGER。

### 2. 生パレット直書きの全廃（`src/app/(dashboard)` 配下）

- `BulkApprovalPanel` の結果アラート: 成功=`bg-bg-success-light border-border-success-light text-success`、失敗=`bg-status-red-bg text-status-red-text`、部分成功=`bg-bg-row-pending border-border-row-pending text-warning` のようにトークン参照へ置換。
- `InvoiceSection` の進捗チャート: `bg-success`（入金済）/ `bg-primary`（請求済）/ `bg-border`（残り）へ置換。
- `DealPhaseStepper` の終端アクションボタン（受注にする/失注にする/見送りにする）: `border-status-green-text text-status-green-text hover:bg-status-green-bg`（green の例。red / gray も同型）へ置換。
- `requests/[id]/ActionButtons.tsx` 等、`(dashboard)` 配下に残る `bg-*-50/100`・`text-*-500/600/700`・`border-*-200/300/600` 形式の生パレットクラスを対応するトークンへ置換する（`grep -rE '(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+' src/app/\(dashboard\)` がゼロ件になること）。

### 3. 入力欄・セレクトの統一

- `INPUT_BASE` / `SELECT_BASE` を正とし、`(dashboard)` 配下のフォーム入力・セレクト・textarea のクラスをこれに揃える（寸法は現行の `px-2.5 py-1.5 text-xs` を維持。色・focus はトークン参照: `border-border` / `focus:border-primary` / `bg-bg-surface` / `text-text` / `placeholder:text-text-placeholder`）。
- 共有 `Input` コンポーネントが存在する場合はそちらの実装を正に合わせる（二重定義しない）。

### 4. テーブルの統一（`DataTable.tsx`）

- th: `text-text-secondary` に変更（サイズ・weight は現行維持）。
- 行 hover をクリック可否によらず `hover:bg-bg-surface-alt` に統一（`hover:bg-primary/10` を廃止。クリック可能行は現行どおり `cursor-pointer` で区別）。
- 縞模様・境界線・padding は現状維持。

### 5. 期限表示の強調（表示専用ロジック）

- 共有ヘルパー `dueDateClass(date: Date | string | null): string` を UI 層（`src/app/(dashboard)/` 配下の共有位置）に新設: 期限切れ（当日より前）= `text-danger font-semibold`、当日 = `text-warning font-semibold`、それ以外・null = `""`。日付比較はローカルタイムの暦日単位（時刻は無視）。
- 適用先: タスク一覧の期日表示、`ActionItemRow` の期日表示（一覧・編集両モードの表示側）。
- ステータスに `overdue` 等の概念を**持ち込まない**（表示時の比較のみ。ドメイン・DB・API 不変）。
- ヘルパーのユニットテスト（過去/当日/未来/null/日付境界）を追加する。

## スコープ外

- レイアウト再配置（詳細ヘッダー・ダッシュボード・フィルタ配置）— 別リクエスト。
- ページネーションの新設（現状のリスト表示方式を維持）。
- 新しいフィルタ・検索の追加。
- 行内リンクアクションのボタン化。
- `(auth)` / `(platform)` 配下（ログイン画面等）の変更。
- フォント・文字サイズスケールの変更。

## 受け入れ基準

- [ ] 既存の全テストが green（挙動不変。クラス名固定テストの期待値追随は可、挙動アサーションの変更は不可）。`typecheck` / `lint` / `build` green。
- [ ] `dueDateClass` のユニットテスト（過去=danger / 当日=warning / 未来・null=空、暦日境界）が green。
- [ ] タスク一覧・アクションアイテムの期日が期限切れ/当日で強調されることをコンポーネント/表示テストで固定する。
- [ ] `src/app/(dashboard)` 配下に生パレットクラス（`(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|emerald)-[0-9]+`）と hex 直書きクラス（`-[#`）が残っていない。
- [ ] `DataTable` の行 hover が単一トークン（`bg-bg-surface-alt`）に統一されている。
- [ ] `aozu check` exit 0・architecture test green。

## 実装上の必須事項

1. **挙動不変**（遷移・Server Action・API/MCP・DB・権限・集計に変更なし）。変更ファイルは `src/app` 配下（UI）に限定する。
2. **表示ラベルの文字列・要素の配置順は不変**。
3. **ダークテーマ確認**: 置換後の全ボタン・アラート・チャート・期限強調が `[data-theme="dark"]` でコントラスト成立すること。
4. 期限比較はレンダリング時の new Date() 比較でよいが、**テストでは固定日時を注入できる形**（引数で基準日を受け取れる等）にする。
5. mock.module 汚染回避（個別ファイル・afterAll 復元）。
6. 成果物は単体で読めること（コード・コメントに経緯を書かない）。

## aozu 影響判定（起票前判定・必須）: **不要**

- 新モジュール(mod): なし（既存 `mod-ui` の実装範囲内。`dueDateClass` は mod-ui 内の表示ヘルパー）。
- 新依存辺(deps): なし。
- 新ドメイン概念(term/ent/inv/act): なし（期限切れの強調は表示規約であり、ドメインに overdue 状態を追加しない）。
- 新シーケンス(seq): なし。

type: refactoring のため設計要素引用は必須対象外。architecture test は緑のまま。
