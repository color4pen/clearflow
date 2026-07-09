# UI デザイン基盤の刷新（デザイントークン＋ステータスバッジ体系）

## Meta

- **type**: refactoring
- **slug**: design-foundation
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI 層内のスタイル刷新であり、層構造・port/adapter の選択は無いため false -->

## 背景

現状の UI は配色が青灰（#2c3e50 系）基調で、ステータス/フェーズの表示手段が統一されていない:

- 案件フェーズは**素テキスト**（`src/app/(dashboard)/deals/page.tsx` の `render: (row) => phaseLabels[row.phase]`）
- 承認リクエストは**ハードコード hex の文字色**（`src/app/(dashboard)/requests/statusUtils.ts` の `text-[#2980b9]` 等）
- アクションアイテムは**生 Tailwind パレットのチップ**（`components/StatusChipSelect.tsx` の `bg-blue-50 text-blue-700`。ダークテーマで背景が明色のまま沈まない）

状態の意味（進行中か・成立か・注意か・終端か）が色から読めず、ダーク対応も表示ごとにバラバラである。本リクエストで **(1) デザイントークン値を slate 基調に刷新し、(2) ステータス表示を「薄背景＋濃文字」のバッジ体系に統一する**。挙動は一切変えない。

## 決定事項

1. **挙動不変**: 画面遷移・Server Actions・API/MCP・DB・権限・集計ロジックに変更なし。変更は `src/app` 配下の表示（CSS トークン値・クラス・表示コンポーネント）のみ。domain / application / infrastructure / api には触れない。
2. **テキスト内容不変**: 表示ラベル文字列は変えない（バッジ化に伴う span 等のマークアップ追加は可）。
3. **フォント・文字サイズ・レイアウト構成は本リクエストでは変更しない**（トークン値・バッジ・カード形状のみ）。
4. **ライト/ダーク両対応必須**: 既存の `[data-theme="dark"]` 機構に沿って全トークンに両テーマの値を定義する。
5. 色の意味論（セマンティクス）: **灰=初期/中立/終端(中立)・青=進行中・緑=成立/良好・黄=注意/保留・赤=否定的終端/危険・紺=完了(肯定的終端)**。

## 現状コードの前提

- トークン: `src/app/globals.css`。`:root`（ライト値）→ `[data-theme="dark"]`（ダーク値）→ `@theme inline`（Tailwind 4 への配線 `--color-*`）の 3 段構成。
- 共有クラス定数: `src/app/(dashboard)/styles.ts`（`SECTION_CARD` = `bg-bg-surface border border-border rounded shadow-sm` 等）。
- ステータス表示の現状: 上記「背景」の 3 箇所のほか、契約 (`contracts/page.tsx`, `contracts/[id]/`)・請求 (`InvoiceSection.tsx`)・引合 (`inquiries/`)・収益 (`revenue/page.tsx`)・通知 (`NotificationPanel.tsx`) に `bg-*-50` / `text-*-700` 系の直書きが分散。
- ステータスのラベル定義: `src/app/(dashboard)/labels.ts`（phaseLabels / statusLabels / contractStatusLabels / invoiceStatusLabels 等）と `requests/statusUtils.ts`。
- 共有 UI コンポーネント置き場: `src/app/(dashboard)/components/`。

## 要件

### 1. デザイントークン値の刷新（`src/app/globals.css`）

トークン**名は既存のまま**、値のみ以下に更新する（名前を変えないことで利用側の class 変更を不要にする）:

| トークン | ライト | ダーク |
|---|---|---|
| `--bg-page` | `#f1f5f9` | `#0f172a` |
| `--bg-surface` | `#ffffff` | `#1e293b` |
| `--bg-surface-alt` | `#f8fafc` | `#334155` |
| `--bg-toolbar` | `#f8fafc` | `#334155` |
| `--bg-header`（サイドバー） | `#0f172a` | `#020617` |
| `--bg-table-head` | `#f8fafc` | `#334155` |
| `--bg-row-pending` | `#fffbeb` | `#3d3520`（現行維持） |
| `--bg-row-revision` | `#fff7ed` | `#3d2e20`（現行維持） |
| `--bg-info` | `#e8effd` | `#172554` |
| `--bg-success-light` | `#f0fdf4` | `#14532d` |
| `--border` | `#e2e8f0` | `#334155` |
| `--border-light` | `#f1f5f9` | `#293548` |
| `--border-table-head` | `#e2e8f0` | `#475569` |
| `--text` | `#0f172a` | `#f1f5f9` |
| `--text-secondary` | `#64748b` | `#cbd5e1` |
| `--text-muted` | `#94a3b8` | `#94a3b8` |
| `--text-disabled` | `#cbd5e1` | `#475569` |
| `--text-placeholder` | `#94a3b8` | `#475569` |
| `--text-on-dark` | `#f8fafc` | 同左 |
| `--text-on-dark-secondary` | `#cbd5e1` | 同左 |
| `--text-on-dark-muted` | `#94a3b8` | 同左 |
| `--text-on-dark-disabled` | `#64748b` | 同左 |
| `--text-sidebar-muted` | `#64748b` | 同左 |
| `--theme-primary` | `#1a56db` | `#60a5fa` |
| `--theme-success` | `#16a34a` | `#4ade80` |
| `--theme-warning` | `#d97706` | `#fbbf24` |
| `--theme-danger` | `#dc2626` | `#f87171` |
| `--theme-revision` | `#ea580c` | `#fb923c` |
| `--theme-draft` | `#1a56db` | `#60a5fa` |
| `--theme-expired` | `#94a3b8` | `#64748b` |

- `--border-row-pending` / `--border-row-revision` / `--border-success-light` は色相を上表に揃えて微調整可（ライトは amber/orange/green の 200 番台相当）。

### 2. ステータス系統トークンの新設（6 系統 × 文字/背景 × ライト/ダーク）

`globals.css` に追加し、`@theme inline` で `--color-status-*` として配線する:

| 系統 | ライト文字 / 背景 | ダーク文字 / 背景 |
|---|---|---|
| `status-gray` | `#6b7280` / `#f3f4f6` | `#d1d5db` / `#374151` |
| `status-blue` | `#2563eb` / `#dbeafe` | `#93c5fd` / `#1e3a8a` |
| `status-green` | `#16a34a` / `#dcfce7` | `#86efac` / `#14532d` |
| `status-yellow` | `#d97706` / `#fef3c7` | `#fcd34d` / `#78350f` |
| `status-red` | `#dc2626` / `#fee2e2` | `#fca5a5` / `#7f1d1d` |
| `status-navy` | `#1e3a5f` / `#dbeafe` | `#bfdbfe` / `#1e3a5f` |

命名例: `--status-gray-text` / `--status-gray-bg` → `--color-status-gray-text` / `--color-status-gray-bg`。

### 3. 共有 `StatusBadge` コンポーネントの新設

`src/app/(dashboard)/components/StatusBadge.tsx`（表示専用・状態なし）:

- Props: `variant: "gray" | "blue" | "green" | "yellow" | "red" | "navy"`, `children`, `className?`
- 形状: pill（`rounded-full`）・`px-2 py-0.5`・`text-2xs font-semibold whitespace-nowrap`・薄背景＋濃文字（系統トークン使用）
- インタラクションを持たない（クリック・フォーカスなし）

### 4. 意味論マッピングの適用（状態表示のバッジ統一）

以下の対応で既存のステータス/フェーズ表示を `StatusBadge` に置き換える。マッピング定義は表示層（`labels.ts` もしくは各画面の近傍）に置き、domain には置かない:

| 対象 | 値 → 系統 |
|---|---|
| 案件フェーズ (`deals` 一覧・詳細ヘッダ・関連表示) | hearing=gray / proposal_prep=blue / proposed=blue / negotiation=blue / won=green / lost=red / passed=gray |
| 引合ステータス (`inquiries`) | new=gray / converted=green / declined=gray |
| 契約ステータス (`contracts`) | active=green / completed=navy / cancelled=red |
| 請求ステータス (`invoices`, `revenue`) | scheduled=gray / invoiced=blue / paid=green / overdue=red |
| 承認リクエスト (`requests/statusUtils.ts`) | draft=gray / pending=yellow / approved=green / rejected=red / revision=yellow / expired=gray |
| 承認ステップ (`stepStatusClass`) | pending=yellow / approved=green / rejected=yellow |
| アクションアイテム (`StatusChipSelect`) | todo=gray / in_progress=blue / done=green（チップ配色を系統トークン参照に変更。ドット色は系統文字色。開閉・選択の挙動は不変） |

- `statusUtils.ts` の `text-[#2980b9]` 等の**ハードコード hex は全廃**し、バッジまたは系統トークン参照に置き換える。
- 上記以外に同種の状態表示（enum 値をそのまま色付き表示している箇所）を発見した場合も同じ意味論で統一する。ただし**通知の未読等、状態 enum でないものは対象外**。
- 一覧のフィルタチップ（deals のフェーズフィルタ等）は選択 UI でありバッジではないため**対象外**（現状維持）。

### 5. カード形状の更新（`styles.ts`）

- `SECTION_CARD` を `rounded-lg`（8px）＋ `shadow-sm` 維持のまま、枠色は新 `--border` に追随（クラス構成は現状の `bg-bg-surface border border-border` を維持し radius のみ `rounded` → `rounded-lg`）。
- 他の定数（BTN_* / INPUT_BASE 等）は**本リクエストでは変更しない**（操作系の刷新は別リクエスト）。

## スコープ外

- ボタン・フォーム・フィルタバー・テーブルの再スタイル（別リクエスト）。
- レイアウト再配置（詳細ヘッダー・ダッシュボード）（別リクエスト）。
- 期限系の行ハイライト（別リクエスト）。
- フォントファミリ・文字サイズスケールの変更。
- レスポンシブ挙動の変更（現状維持）。
- 新しいフィルタ・検索・ページネーション等の機能追加。

## 受け入れ基準

- [ ] 既存の全テストが green（挙動不変。テストがクラス名を固定している場合の期待値追随は可、挙動アサーションの変更は不可）。`typecheck` / `lint` / `build` green。
- [ ] `StatusBadge` の単体テスト: 各 variant が対応する系統トークンのクラスを持ち、children が描画される。
- [ ] 代表画面のコンポーネント/表示テストで、案件フェーズ（won=green / lost=red / hearing=gray）・承認リクエスト（pending=yellow / approved=green）・請求（overdue=red / paid=green）がバッジとして描画されることを固定する。
- [ ] `globals.css` にステータス 6 系統 ×（text/bg）×（ライト/ダーク）のトークンが定義され、`@theme inline` に配線されている。
- [ ] `requests/statusUtils.ts` に `text-[#` 形式のハードコード hex が残っていない。
- [ ] `aozu check` exit 0・architecture test green。

## 実装上の必須事項

1. **挙動不変**（遷移・Server Action・API/MCP・DB・権限・集計に変更なし）。変更ファイルは `src/app` 配下（UI）と `globals.css` / `styles.ts` に限定する。
2. **表示ラベルの文字列は不変**（既存テストの `getByText` を壊さない）。
3. **ダークテーマの実機確認**: `[data-theme="dark"]` で全バッジ・全ページ背景のコントラストが成立すること（薄背景トークンがライト値のまま残らないこと）。
4. mock.module 汚染回避（個別ファイル・afterAll 復元）。
5. 成果物は単体で読めること（コード・コメントに経緯を書かない）。

## aozu 影響判定（起票前判定・必須）: **不要**

- 新モジュール(mod): なし（既存 `mod-ui` の実装範囲内。`StatusBadge` は mod-ui 内の共有コンポーネント）。
- 新依存辺(deps): なし（UI→他層の参照は増えない）。
- 新ドメイン概念(term/ent/inv/act): なし（色の意味論は表示規約であり業務概念でない）。
- 新シーケンス(seq): なし。

type: refactoring のため設計要素引用は必須対象外。architecture test は緑のまま。
