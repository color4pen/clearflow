# Tasks: layout-restyle

## T-01: deals/[id]/page.tsx — PHASE_VARIANT マッピング追加

`deals/[id]/page.tsx` にフェーズ→バッジバリアント変換ロジックを追加する。

- [x] `PHASE_VARIANT` 定数（hearing=gray / proposal_prep=blue / proposed=blue / negotiation=blue / won=green / lost=red / passed=gray）を `deals/[id]/page.tsx` のモジュールスコープに追加する
- [x] `phaseVariant(phase: string): StatusBadgeVariant` ヘルパー関数を追加する（`PHASE_VARIANT[phase] ?? "gray"`）
- [x] `StatusBadgeVariant` 型のインポートを `StatusBadge` から追加する（既存の `StatusBadge` インポートを拡張）
- [x] `phaseLabels` を `labels.ts` からのインポートに追加する（既存の `contractTypeLabels / meetingTypeLabels / contractStatusLabels` インポートを拡張）
- [x] 「deals/page.tsx の PHASE_VARIANT と同期が必要」である旨のコードコメントを定数に添える

**Acceptance Criteria**:
- `deals/[id]/page.tsx` に `PHASE_VARIANT` 定数が存在し、`won: "green"` / `hearing: "gray"` / `lost: "red"` マッピングを含む
- `phaseVariant` 関数が `deals/[id]/page.tsx` に存在する
- `bun run typecheck` が exit 0

---

## T-02: deals/[id]/page.tsx — ヒーロー行再配置

ヘッダー部を「パンくず＋ヒーロー行」の構成に再配置する。ヒーロー行にタイトル・フェーズバッジ・右端操作群を集約する。

- [x] 既存のタイトル `<div className="text-lg font-bold text-text">` を `<h1 className="text-lg font-bold text-text">` に変更する
- [x] ヒーロー行を `<div className="flex items-center gap-2 flex-wrap">` でラップする
- [x] タイトル `h1` の直後に `<StatusBadge variant={phaseVariant(deal.phase)}>{phaseLabels[deal.phase] ?? deal.phase}</StatusBadge>` を挿入する
- [x] 右端操作グループ `<div className="ml-auto flex items-center gap-3">` を作成し、`WatchToggle` と見積承認リンクをその内部に配置する
- [x] `deal.estimateRequestId` 条件付き見積承認リンク（`href="/requests/${deal.estimateRequestId}"`・文言「見積承認を表示」・クラス不変）をタイトル下の独立行からヒーロー行右端グループ内に移動する
- [x] タイトル下の独立した見積承認リンク行（`<div className="text-xs mt-0.5">` ブロック）を削除する
- [x] ステッパー `SectionCard` 内から `WatchToggle` を除去する
- [x] ステッパー `SectionCard` 内の `<div className="flex items-center justify-between gap-3 flex-wrap">` ラッパーを削除し、`DealPhaseStepper` を直接 `SectionCard` の子として配置する

**Acceptance Criteria**:
- ヒーロー行に `h1 タイトル`・`StatusBadge`・`WatchToggle`・（条件付き）見積承認リンクが同居している
- `estimateRequestId` が null の場合、ヒーロー行右端グループに見積承認リンクが存在しない
- `estimateRequestId` が存在する場合、リンク先が `/requests/{estimateRequestId}` で文言が「見積承認を表示」（変更なし）
- ステッパー `SectionCard` 内に `WatchToggle` が存在しない
- `bun run typecheck` と `bun run lint` が exit 0

---

## T-03: SalesDashboard.tsx — KPI グリッド再配置

パイプラインサマリを個別カードの可変グリッドに置き換える。

- [x] パイプラインサマリの外側 `<SectionCard className="p-4">` ラッパーと内部の `<h2>パイプラインサマリ</h2>` を削除する
- [x] `<div className="grid grid-cols-8">` を `<div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">` に変更する
- [x] `pipelineSummary.map` の各要素を `<SectionCard className="p-3">` でラップする（既存の `Link` を `SectionCard` の子として維持し、クリック可能領域を保つ）
- [x] 各カード内のラベル `div` を `className="text-xs text-text-secondary mb-1"` に変更する（現状: `text-xs text-text-muted mb-1`）
- [x] 各カード内の値 `div` を `className="text-2xl font-bold text-text"` に変更する（現状: `text-xl font-bold text-text`）
- [x] 各カード内の単位 `span` を `className="text-xs font-normal ml-0.5"` に変更する（現状: `text-sm font-normal ml-0.5`）
- [x] 各カード内のサブ表示（金額行）を `className="text-2xs text-text-muted font-mono"` に変更する（現状: `text-xs text-text-secondary font-mono`）
- [x] 合計列の `Link`（`href="/deals"`）にも同様のカード化とスタイル変更を適用する
- [x] 各フェーズ `Link` に付いていた `border-r border-border` 列区切り線クラスを削除する（個別カード化により不要）
- [x] 各フェーズ `Link` の `hover:bg-bg-page` は維持する（カード内 Link にそのまま保持する）

**Acceptance Criteria**:
- `SalesDashboard.tsx` に `grid-cols-8` が存在しない
- `SalesDashboard.tsx` に `auto-fill` が存在する
- `SalesDashboard.tsx` に `minmax(150px` が存在する
- `SalesDashboard.tsx` に `text-2xl font-bold` が存在する
- 全フェーズラベル（`phaseLabels` 参照）と値（`item.count` / `item.totalAmount`）の描画ロジックが変わっていない
- `bun run typecheck` と `bun run lint` が exit 0

---

## T-04: SalesDashboard.tsx — セクション h2 色統一

SalesDashboard 内の全セクション見出し `h2` の色を本文色に変更する。

- [x] 「アクション待ちリスト」`h2` のクラスを `text-sm font-semibold text-text-muted` → `text-sm font-semibold text-text` に変更する
- [x] 「停滞案件リスト」`h2` のクラスを `text-sm font-semibold text-text-muted` → `text-sm font-semibold text-text` に変更する
- [x] 「直近の活動」`h2` のクラスを `text-sm font-semibold text-text-muted` → `text-sm font-semibold text-text` に変更する
- [x] 各 `h2` の文言・他クラス（`mb-2` 等）は変更しない
- [x] 「アクション待ちリスト」`h2` のカウント・超過バッジ要素（`span` 子要素）は変更しない

**Acceptance Criteria**:
- `SalesDashboard.tsx` に `text-sm font-semibold text-text-muted` が存在しない
- 文言「アクション待ちリスト」「停滞案件リスト」「直近の活動」が変わっていない
- `bun run typecheck` と `bun run lint` が exit 0

---

## T-05: テスト追加 — 案件詳細ヒーローヘッダー静的検証

`src/__tests__/components/dealDetailHeroHeader.test.ts` を新規作成し、deals/[id]/page.tsx のヒーロー行構成を静的ファイル解析で固定する。

- [x] `describe("deals/[id]/page.tsx — ヒーローヘッダー")` ブロックを作成する
- [x] `StatusBadge` が deals/[id]/page.tsx にインポートされていることを確認するテスト
- [x] `PHASE_VARIANT` または `phaseVariant` が deals/[id]/page.tsx に存在することを確認するテスト
- [x] `won.*green` マッピングが deals/[id]/page.tsx に存在することを確認するテスト（正規表現）
- [x] `lost.*red` マッピングが deals/[id]/page.tsx に存在することを確認するテスト（正規表現）
- [x] `hearing.*gray` マッピングが deals/[id]/page.tsx に存在することを確認するテスト（正規表現）
- [x] `WatchToggle` が deals/[id]/page.tsx に存在することを確認するテスト
- [x] `estimateRequestId` の条件チェックが deals/[id]/page.tsx に存在することを確認するテスト
- [x] deals/[id]/page.tsx に `text-[#` 形式のハードコード hex クラスが存在しないことを確認するテスト
- [x] テストは既存の `statusBadgeIntegration.test.ts` と同じ静的解析パターン（`readFile` + `expect(content).toContain/toMatch`）を採用する

**Acceptance Criteria**:
- `bun test src/__tests__/components/dealDetailHeroHeader.test.ts` が全テスト green
- 既存の他テストに影響しない（mock 汚染なし、afterAll 復元不要の純粋ファイル読み取りのみ）

---

## T-06: テスト追加 — ダッシュボード KPI グリッド静的検証

`src/__tests__/components/salesDashboardKpi.test.ts` を新規作成し、SalesDashboard.tsx の KPI グリッド構成と h2 色統一を静的ファイル解析で固定する。

- [x] `describe("SalesDashboard.tsx — KPI グリッド")` ブロックを作成する
- [x] `grid-cols-8` が SalesDashboard.tsx に存在しないことを確認するテスト（KPI グリッド廃止）
- [x] `auto-fill` が SalesDashboard.tsx に存在することを確認するテスト（可変グリッド採用）
- [x] `text-2xl font-bold` が SalesDashboard.tsx に存在することを確認するテスト（KPI 値スタイル）
- [x] `describe("SalesDashboard.tsx — h2 色統一")` ブロックを作成する
- [x] `text-sm font-semibold text-text-muted` が SalesDashboard.tsx に存在しないことを確認するテスト（h2 色変更確認）
- [x] `describe("SalesDashboard.tsx — ハードコード排除")` ブロックを作成する
- [x] SalesDashboard.tsx に `text-[#` 形式のハードコード hex クラスが存在しないことを確認するテスト

**Acceptance Criteria**:
- `bun test src/__tests__/components/salesDashboardKpi.test.ts` が全テスト green
- 既存の他テストに影響しない

---

## T-07: 品質ゲート通過確認

実装完了後、全品質ゲートが通過することを確認する。

- [x] `bun run typecheck` が exit 0
- [x] `bun run lint` が exit 0
- [x] `bun run build` が exit 0（Next.js プロダクションビルド成功）
- [x] `bun test` が exit 0（既存テスト + T-05・T-06 の新規テストをすべて含む）

**Acceptance Criteria**:
- 全コマンドが exit 0
- 既存の挙動テスト（Server Action アサーション・遷移テスト等）が green のまま
- `src/app/(dashboard)` 配下に新たな生パレットクラス・hex 直書きクラスが持ち込まれていない
