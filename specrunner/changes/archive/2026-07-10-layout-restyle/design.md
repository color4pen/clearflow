# Design: layout-restyle

## Context

案件詳細（`src/app/(dashboard)/deals/[id]/page.tsx`）とダッシュボード（`src/app/(dashboard)/dashboard/SalesDashboard.tsx`）の 2 画面に対してレイアウトとスタイルを再配置する。挙動・データ・集計・権限・遷移には一切変更を加えない。

### 現状の課題

- **案件詳細のヘッダー**: パンくず＋素のタイトル `div`（`text-lg font-bold`）のみ。案件フェーズがヘッダーに表示されない。`WatchToggle` はフェーズステッパー `SectionCard` 内、見積承認リンクはタイトル下と、関連操作・情報が分散している。
- **ダッシュボードの KPI 表示**: 1 枚の `SectionCard` 内に `grid-cols-8` で 8 指標を平置き。指標間の視覚的区切りと階層が弱く、個々の指標の重みが表現されていない。セクション見出し `h2` が `text-text-muted`（補助色）で描画されており、コンテンツ主見出しとしてのコントラストが弱い。

### 前提条件

- デザイントークン（ステータス 6 系統: gray/blue/green/yellow/red/navy）・`StatusBadge` コンポーネント・`WatchToggle` は実装済み。
- `deals/page.tsx` に `PHASE_VARIANT` マッピング（hearing=gray / proposal_prep・proposed・negotiation=blue / won=green / lost=red / passed=gray）が実装済み。
- `phaseLabels` は `src/app/(dashboard)/labels.ts` に定義済み。

## Goals / Non-Goals

**Goals**:
- 案件詳細のヒーロー行に「タイトル（h1）・フェーズ `StatusBadge`・`WatchToggle`・見積承認リンク（条件付き）」を集約する。
- ダッシュボードのパイプライン KPI を、指標ごとの独立 `SectionCard` の可変グリッドに再配置する。
- ダッシュボードの全セクション見出し（`h2`）の色を `text-text-muted` から `text-text` に統一する。
- 新規テストで変更後の表示構造を固定し、リグレッションを検出可能にする。

**Non-Goals**:
- 他の詳細画面（契約・請求・引合・申請・顧客）へのヒーローヘッダー横展開。
- FinanceDashboard の変更。
- 新規 KPI・集計・目標値表示の追加。
- 右レール新設・タブ化・セクションの追加/削除/並べ替え。
- レスポンシブ挙動の変更（既存ブレークポイントを維持）。
- Server Actions・API/MCP・DB・権限・集計の変更。

## Decisions

### D1: PHASE_VARIANT マッピングを deals/[id]/page.tsx に複製する

`deals/page.tsx` にある `PHASE_VARIANT` 定数と `phaseVariant` ヘルパーを `deals/[id]/page.tsx` に複製する。

**理由**: `PHASE_VARIANT` は `deals/page.tsx` のモジュールスコープに定義されており、現時点でエクスポートされていない。共有モジュールへの抽出（`labels.ts` や `StatusBadge.tsx` への追加）は今回のスコープ（2 画面のレイアウト再配置）を超える。複製が最小変更で済む。

**代替案**:
- `phaseVariant` を `labels.ts` にエクスポートする → 今回スコープ外の変更を伴うため見送り。
- `StatusBadge` に phase→variant マッピングを内包する → コンポーネントにドメイン知識を持ち込む設計変更であり見送り。

**同期リスク**: 複製により deals/page.tsx と乖離するリスクがある。コードコメントで `deals/page.tsx` との同期が必要な旨を明記して担保する。

### D2: WatchToggle をステッパーカードからヒーロー行右端へ移動する

現行のステッパー `SectionCard` 内に `flex justify-between` で配置されている `DealPhaseStepper` + `WatchToggle` の並置を解体し、`WatchToggle` だけをヒーロー行の右端グループ（`ml-auto flex items-center gap-3`）に移動する。ステッパーカードは `DealPhaseStepper` のみを内包するように簡略化する。

**理由**: `WatchToggle` は「この案件をウォッチする」というページ全体への操作であり、フェーズ進捗の関心事ではない。ページヘッダーに属する操作を一か所に集約することで操作の発見性が上がる。コンポーネント・props・挙動は不変。

### D3: KPI グリッドに repeat(auto-fill, minmax(150px, 1fr)) を採用する

`grid-cols-8` の固定カラムを廃止し、`grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]`（Tailwind 任意値クラス）に置き換える。各指標（フェーズ別 count/totalAmount + 合計）は `SectionCard` として独立する。外側の「パイプラインサマリ」`SectionCard` ラッパーは削除する。

**理由**: 指標ごとにカード境界が生まれ、視覚的な区切りと階層が明確になる。`auto-fill` + `minmax` はビューポート幅に柔軟に対応し、将来的な指標数変動にも耐えやすい。

**代替案**:
- `grid-cols-4 md:grid-cols-8` 等のブレークポイント固定 → 既存ブレークポイント挙動の維持制約に抵触するおそれがあり採用しない。
- 各指標を `div` でラップするだけでカードにしない → 視覚的な区切りが不十分。

### D4: セクション h2 を text-text に統一する（SalesDashboard のみ）

SalesDashboard 内の全 `h2` 要素のクラスを `text-sm font-semibold text-text-muted` から `text-sm font-semibold text-text` に変更する。対象: アクション待ちリスト・停滞案件リスト・直近の活動。

**理由**: `text-text-muted` はサブテキスト（補助情報）に用いるトークン。セクション見出しはコンテンツ主要ラベルであり、本文色（`text-text`）で描画するのが適切。KPI カード化によって各指標が自明になるため、見出しの視認性をより明確にする。

**代替案**: 変更しない → 一貫性の問題が残り、ダークテーマでのコントラスト不足が生じる可能性がある。

## Risks / Trade-offs

- **[Risk] D1 の PHASE_VARIANT 複製による乖離**: 将来 `DealPhase` に新フェーズが追加されたとき、`deals/page.tsx` と `deals/[id]/page.tsx` の両方を更新する必要がある。→ コードコメントで同期必要であることを明記し、将来の共有化リクエストでまとめて解消する。
- **[Risk] ダークテーマのコントラスト**: ヒーロー行・KPI カードがデザイントークンのみ参照していれば `[data-theme="dark"]` での自動対応が保証される。生パレット・hex を持ち込まないルール遵守で担保する。
- **[Trade-off] 外側 SectionCard の削除**: パイプラインサマリを包む `SectionCard` を削除することで、当該エリアの背景色・ボーダーが消える。代わりに各指標カードが独立した視覚境界を持つため、視覚的なまとまりは維持される。

## Open Questions

なし。
