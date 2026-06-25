# Design: 売上画面のデザイン適用

## Context

売上画面は 3 ページ構成（ダッシュボード / 明細 / 予実管理）で稼働中。Claude Design の REVENUE DASHBOARD / SALES DETAIL / PLAN セクションと現行 UI にレイアウト差分がある。

現行の状態:

- **ダッシュボード** (`revenue/page.tsx`): 2 カラム KPI（今月入金済み / パイプライン予測）、月次推移テーブル、顧客別ランキング DataTable。確定見込み（請求予定）カードが欠落。月次行やランキング行にナビゲーションリンクがない。
- **明細** (`revenue/details/page.tsx`): 期間フィルタ＋`<select>` で集計軸切替。CSV エクスポートは実装済み。テーブル行にナビゲーションがない。
- **予実管理** (`revenue/forecast/page.tsx`): 年次固定の期間表示。目標設定フォームあり（新規のみ、編集不可）。プログレスバーは実績のみの単色表示。

共通コンポーネント: `PageToolbar`, `SectionCard`, `DataTable`（rowHref 対応済み）, `MoneyInput`, `LinkButton`。いずれもそのまま利用可能。

制約:

- グラフライブラリの導入はスコープ外。CSS バーまたはテーブルで代替する。
- ビジネスロジック（domain layer の状態遷移・バリデーションルール）は変更しない。
- 本変更は UI レイアウト + 読み取り専用データアクセスの拡充に限定する。

## Goals / Non-Goals

**Goals**:

- ダッシュボードを 3 カラム KPI カード（今月売上 / 確定見込み / パイプライン）に拡張する
- 月次推移に視覚的バー表示を追加し、月クリックで明細遷移できるようにする
- 顧客別ランキングの行クリックで顧客詳細へ遷移できるようにする
- 明細の集計軸切替をタブ UI に変更する
- 予実管理に期間種別（月次/四半期/年次）切替を追加する
- 既存目標の金額をインライン編集できるようにする
- プログレスバーにパイプライン見込みを加味した着地予測を視覚化する

**Non-Goals**:

- グラフライブラリの選定・導入
- domain layer のロジック変更（型定義・状態遷移・バリデーション）
- API エンドポイントの新規追加（CSV エクスポートは既存を維持）
- テストケースの新規追加（既存テストの green 維持のみ）

## Decisions

### D1: 確定見込み KPI のデータソース

`revenueRepository` に `getConfirmedRevenue(organizationId, startDate, endDate)` を追加する。invoice テーブルから `status IN ('scheduled', 'invoiced')` の合計金額を返す read-only クエリ。

- **Rationale**: 既存の `getMonthlyRevenue` は `status = 'paid'` のみ集計する。確定見込みは「未入金だが請求確定済み」の金額であり、status フィルタを変えるだけで取得できる。domain model に新しい型は不要（number を返すだけ）。
- **Alternatives**: (a) pipelineSummary から won フェーズの estimatedAmount を流用 → 請求金額と案件見積もりは異なるため不正確。(b) クライアント側で計算 → Server Component から repository を直接呼べないため usecase 経由が必要。
- `getRevenueDashboard` の戻り値に `confirmedRevenue: number` を追加する。

### D2: 月次推移の棒グラフ代替

テーブルの各行に CSS `width` ベースの水平バーを追加する。月内の最大金額を 100% として相対幅で表示。

- **Rationale**: グラフライブラリはスコープ外。CSS バーなら追加依存なしで視覚的に金額比較できる。
- **Alternatives**: (a) 数値テーブルのみ → 視覚的な比較が難しい。(b) SVG 手書き → 保守コストが高い。

### D3: 顧客ランキングのナビゲーション

`DataTable` の `rowHref` prop に `/clients/${row.clientId}` を渡す。`/clients/[id]` ページは既存。

- **Rationale**: `DataTable` は `rowHref` を受け取り、`RowClickHandler` で行クリックナビゲーションを実現する仕組みが実装済み。新規コンポーネント不要。
- **Alternatives**: (a) clientName カラムを Link コンポーネントでラップ → 行全体のクリック UX が得られない。

### D4: 集計軸のタブ UI 化

明細ページの `<select name="axis">` を Link ベースのタブ UI に変更する。各タブは `?axis=monthly` 等の searchParams を保持した Link で、サーバー側で searchParams を読み取る既存の仕組みを維持する。

- **Rationale**: タブは集計軸の切替を視覚的に明示する。Link ベースなので Server Component のまま動作する（Client Component 化不要）。
- **Alternatives**: (a) `<select>` のまま → デザイン仕様と不一致。(b) Client Component でタブ state 管理 → 不必要な複雑化。

### D5: 予実管理の期間種別切替

`periodType` searchParam（`monthly` | `quarterly` | `yearly`）を追加し、選択に応じて periodStart / periodEnd を算出する。デフォルトは `yearly`（現行互換）。

- **Rationale**: 月次・四半期で進捗を確認したいユースケースに対応する。usecase の引数は periodStart / periodEnd のまま変わらない。
- **Alternatives**: (a) フリー入力の日付ピッカー → 操作が煩雑。(b) periodType を usecase 内で解釈 → usecase の責務を超える。

### D6: 目標金額のインライン編集

既存の目標カード内の金額表示を `MoneyInput` + form action に置換する。`updateRevenueTargetAction` を `src/app/actions/revenue.ts` に追加し、既存の `revenueTargetRepository` の update メソッドを利用する。

- **Rationale**: `MoneyInput` コンポーネントが既存。Server Action の form パターンで Client Component 化を最小限にできる。
- **Alternatives**: (a) 専用の編集モーダル → 操作ステップが増える。(b) 全目標を一括編集フォーム → 複雑すぎる。

### D7: プログレスバーの着地予測表示

プログレスバーを 2 色セグメントにする。実績（primary カラー）+ パイプライン見込み（primary/30 の半透明）で着地予測のカバー率を視覚化する。

- **Rationale**: 既存の `landingForecast` データを活用する。着地予測 = 実績 + パイプライン合計で、既に usecase で計算済み。CSS だけで表現可能。
- **Alternatives**: (a) 数値表示のみ → 目標到達の感覚が掴みにくい。(b) 別の円グラフ → グラフライブラリ必要。

## Risks / Trade-offs

- **[Risk] 確定見込みクエリのパフォーマンス** → invoice テーブルの organizationId + status にインデックスが存在する前提。既存クエリと同じテーブル・同じパターンのため追加リスクは低い。
- **[Risk] CSS バーの視認性** → 金額差が極端な場合（1 件だけ突出）、他の月のバーが細くなりすぎる。最大値に対する相対比なので、ゼロ件月は非表示で対応する。
- **[Trade-off] タブ UI は Link ベース** → 切替のたびにサーバーリクエストが発生する。ただし Server Component のデータ一貫性を維持でき、キャッシュも効く。

## Open Questions

なし。
