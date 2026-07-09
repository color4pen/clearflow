# レイアウト再配置（案件詳細ヒーローヘッダー＋ダッシュボード KPI カード化）

## Meta

- **type**: refactoring
- **slug**: layout-restyle
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: UI 層内のレイアウト再配置であり、層構造・port/adapter の選択は無いため false -->

前提: デザイントークン（ステータス 6 系統）・`StatusBadge`・ボタン 3 階層が main に取り込み済みであること。

## 背景

- **案件詳細のヘッダーが状態を語らない**: `deals/[id]/page.tsx` はパンくず＋素のタイトル（`text-lg font-bold`）のみで、案件のフェーズ（今どういう状態か）がヘッダーに無い。ウォッチ切替はフェーズステッパーのカード内、見積承認リンクはタイトル下と、関連操作・情報が分散している。
- **ダッシュボードの KPI が read しづらい**: `dashboard/SalesDashboard.tsx` は 1 枚の `SectionCard` 内に `grid grid-cols-8` で 8 指標を詰め込んでおり（ラベルと `text-xl` の値）、指標間の区切りと視覚階層が弱い。

案件詳細に「ヒーローヘッダー」（タイトル＋フェーズバッジ＋主要リンク・操作の集約）を導入し、ダッシュボードの指標を独立した KPI カードのグリッドに再配置する。**表示している情報・操作・集計値は一切変えず、配置とスタイルのみ変更する。**

## 決定事項

1. **挙動不変**: 画面遷移・Server Actions・API/MCP・DB・権限・集計に変更なし。表示する値・ラベル文字列・リンク先・操作（クリックで起きること）も不変。変わるのは**要素の配置とクラスのみ**。
2. **本リクエストの対象は 2 画面のみ**: 案件詳細（`deals/[id]`）とダッシュボード（`dashboard/SalesDashboard.tsx`）。他の詳細画面への横展開は結果を確認してから別リクエストで行う。
3. ライト/ダーク両対応（トークン参照のみ。生パレット・hex を持ち込まない）。

## 現状コードの前提

- 案件詳細 `src/app/(dashboard)/deals/[id]/page.tsx`:
  - ヘッダー部（62〜80 行付近）: パンくず（案件一覧 > タイトル）→ タイトル `text-lg font-bold` → 見積承認リンク（存在時）。
  - その直下に `SectionCard`（フェーズステッパー `DealPhaseStepper` ＋ `WatchToggle` を左右配置）。
  - 以降は 1.5fr:1fr の 2 カラムグリッドに `DealInfoSection`（想定金額等の基本情報）ほかのセクション。
- ダッシュボード `src/app/(dashboard)/dashboard/SalesDashboard.tsx`:
  - 124 行付近: `SectionCard` 1 枚に `grid grid-cols-8` で 8 指標（ラベル `text-sm font-semibold text-text-muted` 系＋値 `text-xl font-bold`）。
  - 以降は 1.55fr:1fr のグリッドに各セクションカード（`h2` は `text-sm font-semibold text-text-muted`）。
- `StatusBadge`（variant: gray/blue/green/yellow/red/navy）と案件フェーズの variant 対応（hearing=gray / proposal_prep・proposed・negotiation=blue / won=green / lost=red / passed=gray）は導入済み。

## 要件

### 1. 案件詳細のヒーローヘッダー化（`deals/[id]/page.tsx`）

ヘッダー部を次の構成に再配置する:

```
パンくず（現状のまま: 案件一覧 > {タイトル}）
┌─ ヒーロー行 ─────────────────────────────────────┐
│ h1 タイトル（text-lg font-bold 維持）              │
│   ＋ 直後にフェーズ StatusBadge（phaseVariant）    │
│                     右端: WatchToggle・見積承認リンク │
└──────────────────────────────────────────────┘
フェーズステッパーの SectionCard（現状のまま。WatchToggle は上へ移動済み）
```

- タイトル行は `flex items-center gap-2 flex-wrap`、右端の操作・リンク群は `ml-auto flex items-center gap-3`。
- **フェーズバッジ**はタイトルの直後（deals 一覧と同じ `StatusBadge` × phaseVariant を使用）。
- **WatchToggle** をステッパーのカードから**ヒーロー行の右端へ移動**（コンポーネント・props・挙動は不変。位置のみ）。
- **見積承認リンク**（`estimateRequestId` 存在時）をタイトル下の独立行からヒーロー行右端へ移動（文言・遷移先不変）。
- ステッパーのカードは WatchToggle が抜けた分のレイアウト（`justify-between` の相手が消える）を整えるのみ。
- DealInfoSection 等、以降のセクション構成・中身は変更しない。

### 2. ダッシュボードの KPI カード化（`SalesDashboard.tsx`）

- `grid-cols-8` の単一カードを、**指標ごとの独立カードのグリッド**に置き換える:
  - グリッド: `grid gap-3` ＋ `grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))`（Tailwind の任意値クラスで可）。
  - 各カード: `SectionCard`（既存コンポーネント）＋ `p-3`。中身は「ラベル（`text-xs text-text-secondary`）→ 値（`text-2xl font-bold text-text`、単位は `text-xs font-normal`）→ 既存のサブ表示があればそのまま下段（`text-2xs text-text-muted`）」の縦積み。
  - **8 指標のラベル文字列・値・並び順は現状のまま**（見た目の階層のみ変更）。
- セクション見出し `h2` を全カードで `text-sm font-semibold text-text` に統一（現状の `text-text-muted` から本文色へ。文言不変）。
- セクションカード内の一覧・グラフ・期限強調（`text-danger` 等）は現状維持。

## スコープ外

- 他の詳細画面（契約・請求・引合・申請・顧客）のヒーローヘッダー化（結果確認後に別リクエスト）。
- 右レール新設・タブ化・セクションの追加/削除/並べ替え（ヒーロー行と KPI グリッド以外の構造変更はしない）。
- 新しい集計・KPI の追加、目標値表示。
- FinanceDashboard の変更（SalesDashboard のみ）。
- レスポンシブ挙動の変更（既存のブレークポイント挙動を維持）。

## 受け入れ基準

- [ ] 既存の全テストが green（挙動不変。クラス名・DOM 構造固定テストの期待値追随は可、挙動アサーションの変更は不可）。`typecheck` / `lint` / `build` green。
- [ ] 案件詳細のヒーロー行にタイトル・フェーズ `StatusBadge`・WatchToggle が同居することをコンポーネント/表示テストで固定する（won=green 等の variant 対応込み）。
- [ ] 見積承認リンクが `estimateRequestId` 存在時のみヒーロー行に表示される（従来と同じ条件・同じ遷移先）。
- [ ] ダッシュボードの 8 指標が個別カードで描画され、ラベル・値が従来と同一であることを固定する。
- [ ] `src/app/(dashboard)` 配下に生パレットクラス・hex 直書きクラスを新たに持ち込んでいない。
- [ ] `aozu check` exit 0・architecture test green。

## 実装上の必須事項

1. **挙動不変**（遷移・Server Action・API/MCP・DB・権限・集計に変更なし）。変更ファイルは対象 2 画面（＋必要なら共有コンポーネントのスタイルのみ）に限定する。
2. **表示ラベル・値・リンク先の文字列は不変**（既存テストの `getByText` を壊さない）。
3. **ダークテーマ確認**: ヒーロー行・KPI カードが `[data-theme="dark"]` でコントラスト成立すること。
4. mock.module 汚染回避（個別ファイル・afterAll 復元）。
5. 成果物は単体で読めること（コード・コメントに経緯を書かない）。

## aozu 影響判定（起票前判定・必須）: **不要**

- 新モジュール(mod): なし（既存 `mod-ui` の実装範囲内の再配置）。
- 新依存辺(deps): なし。
- 新ドメイン概念(term/ent/inv/act): なし（配置とスタイルの規約のみ）。
- 新シーケンス(seq): なし。

type: refactoring のため設計要素引用は必須対象外。architecture test は緑のまま。
