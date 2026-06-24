# Design: ダッシュボード画面のデザイン適用

## Context

D01 でテーマ基盤（CSS 変数・フォント定義）とサイドバーレイアウトを適用済み。本変更では営業ダッシュボード（`SalesDashboard.tsx`）と経理ダッシュボード（`FinanceDashboard.tsx`）の画面レイアウトを Claude Design に合わせる。

現状の両ダッシュボードは以下の構造:
- `PageToolbar` による統一ヘッダー + `SectionCard` の縦積み
- 全セクションが HTML `<table>` ベースの表示
- パイプラインサマリは 5 カラム（合計列なし）
- 経理ダッシュボードに KPI カードグリッドなし

データ取得は既存の usecase（`getDashboardActions`, `getPipelineSummary`, `getRecentActivities`, `listInvoicesByOrganization`）をそのまま使用する。

## Goals / Non-Goals

**Goals**:

- 営業ダッシュボードをデザインに合わせた構造に変更する（専用ヘッダー、6 カラムパイプライン、2 カラムメインコンテンツ、flex ベースのリスト表示）
- 経理ダッシュボードをデザインに合わせた構造に変更する（専用ヘッダー、KPI グリッド、6 カラム期日超過テーブル、2 カラム下部レイアウト）
- 金額・日付フィールドに mono フォント（`font-mono` = IBM Plex Mono）を適用する
- 超過状態のアイテムを赤文字 + ラベルで視覚的に強調する

**Non-Goals**:

- データ取得ロジックの変更（既存 usecase をそのまま使用）
- 新規 usecase・リポジトリの追加
- レスポンシブ対応
- `PageToolbar` コンポーネント自体の削除（他画面で使用中）

## Decisions

### D1: テーブルを flex/grid レイアウトに置換 (architect 評価済み)

**決定**: HTML `<table>` を CSS grid / flex レイアウトに全面置換する。

**理由**: デザイン HTML が flex/grid を使用しており、`1.55fr:1fr` 等の列幅比率指定はテーブルでは再現困難。

**却下案**: テーブルのスタイル修正のみ — デザインの列幅比率を再現できない。

### D2: DashboardHeader 共通コンポーネントの新設

**決定**: `src/app/(dashboard)/dashboard/DashboardHeader.tsx` に営業・経理共通のヘッダーコンポーネントを新設する。props は `title`, `subtitle`, `actions` (ReactNode)。

**理由**: 営業ダッシュボード（R1）と経理ダッシュボード（R7）で同一構造のヘッダーを使用する。`PageToolbar` は他画面向けの統一ヘッダーであり、ダッシュボード固有のサブテキスト（日付 + ロール）やアクションボタン配置に合わない。

**却下案**: `PageToolbar` を拡張 — ダッシュボード固有の subtitle / ボタンスタイルが他画面の PageToolbar と互換しない。影響範囲が広がる。

### D3: パイプラインサマリの合計列をフロントエンドで算出

**決定**: 6 カラム目の「合計」は `pipelineSummary` 配列の `count` と `totalAmount` をフロントエンドで sum して表示する。

**理由**: 既存の `getPipelineSummary` usecase は 5 フェーズ分の `PipelineSummaryItem[]` を返す。合計は単純な加算であり、usecase 変更不要。

**却下案**: usecase に合計行を追加 — データ取得ロジック変更がスコープ外。

### D4: アクションタイプラベルの色分け

**決定**: タイプラベルの背景色は既存テーマ変数を活用する。

| タイプ | ラベル | 背景色 | テキスト色 |
|--------|--------|--------|------------|
| approval | 承認待ち | `bg-warning/10` | `text-warning` |
| action_item | アクション | `bg-primary/10` | `text-primary` |
| inquiry | 新規引合 | `bg-success/10` | `text-success` |

**理由**: 既存テーマの semantic color を使用することで、ダークモードとの互換性を維持しつつ視覚的に区別可能。

### D5: 相対時間フォーマットのユーティリティ関数

**決定**: `formatRelativeTime(date: Date): string` を `SalesDashboard.tsx` 内のローカル関数として実装する。「○分前」「○時間前」「○日前」形式で返す。

**理由**: 直近の活動セクションがデザインで相対時間表示を求めている。現状は `toLocaleString` で絶対時間を表示。プロジェクト全体で共有する要件がないため、ローカル関数で十分。

### D6: 超過日数の算出

**決定**: 停滞日数・超過日数はコンポーネント内で `Math.floor((Date.now() - date.getTime()) / 86400000)` により算出する。

**理由**: 純粋な表示ロジックであり、ドメインロジックではない。usecase に持ち込む必要がない。

### D7: 経理ダッシュボードの請求データ表示カラム

**決定**: `Invoice` モデルが保持するフィールド（`title`, `contractId`, `amount`, `dueDate`, `issueDate`）で表示を構成する。デザイン上の「契約名」「顧客名」カラムは、現行データモデルに名前フィールドがないため、`title` を主要識別子とし `contractId` をリンクとして提供する。

**理由**: データ取得ロジック変更がスコープ外。`Invoice` モデルには `contractId` はあるが `contractName` / `customerName` はない。表示可能なフィールドで最善のレイアウトを構成し、名前解決は別リクエストに委ねる。

**影響**: 期日超過テーブル（R9）は 6 カラムではなく 5 カラム（請求タイトル, 契約リンク, 金額, 支払期日, 超過日数）で構成する。下部 2 カラム（R10）も同様に利用可能フィールドで構成する。

## Risks / Trade-offs

**[Risk] AuditLog に actorName がない** → 直近の活動で `actorId` の先頭 8 文字をフォールバック表示する。デザインの「担当者名」表示はデータモデル拡張後に対応。

**[Risk] Invoice に contractName / customerName がない** → D7 で決定した通り、利用可能フィールドでレイアウトを構成。デザインとの完全一致は別リクエストでデータモデル拡張後に達成する。

**[Trade-off] SalesDashboard が "use client" のまま** → 日付計算や相対時間表示がクライアントサイドで実行される。SSR で計算するにはコンポーネント分割が必要だが、レイアウト変更のスコープでは現状維持とする。

## Open Questions

1. **actorName 解決**: AuditLog のデータモデルに `actorName` を追加する別リクエストを作成すべきか？（本変更では actorId フォールバック）
2. **Invoice の名前解決**: Invoice テーブルまたは DTO に `contractName` / `customerName` を追加する別リクエストを作成すべきか？（本変更では title + contractId リンク）
