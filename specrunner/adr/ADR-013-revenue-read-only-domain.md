# ADR-013: 売上モジュール — 読み取り専用ドメインと集計リポジトリパターン

- **Status**: accepted
- **Date**: 2026-06-24
- **Change**: revenue-module
- **Deciders**: architect

---

## Context

売上管理機能（ダッシュボード・売上明細・予実管理）を新設するにあたり、「売上実績」のデータをどう管理するかを決定する必要があった。システムにはすでに `contracts`（契約）と `invoices`（請求）テーブルが存在し、請求の `status = "paid"` かつ `paidAt` が設定されているレコードが入金確認済みの売上実績を表している。

選択肢は大きく2つに分かれた：
1. 請求から独立した売上レコードテーブルを作成し、入金確認時に売上レコードを生成する方式
2. 売上実績は請求テーブルへの集計クエリで算出し、独自エンティティを持たない読み取り専用ドメインとして設計する方式

加えて、集計クエリをどのレイヤー・どのリポジトリに配置するかという実装上の判断も必要だった。既存の `invoiceRepository`・`dealRepository` はそれぞれ CRUD 操作が中心であり、集計クエリのない状態で構築されていた。

---

## Decisions

### D1: 売上実績は請求テーブルへの集計クエリで算出する（読み取り専用ドメイン）

**Decision**: 売上モジュールが独自に保持するエンティティは `revenue_targets`（売上目標）のみ。売上実績の数値は `invoices` テーブルを正として、集計クエリ（SUM/GROUP BY）によって算出する。`revenueRepository` は INSERT/UPDATE を行わない純粋な読み取り専用リポジトリとして実装する。

#### Alternative 1: 売上レコードテーブルの新設（イベント駆動方式）

| | |
|---|---|
| **Pros** | 集計クエリが不要でダッシュボードの応答が速い。過去の売上実績をスナップショットとして保持できる |
| **Cons** | 請求ステータス変更（paid → unpaid のような修正）と売上レコードの同期管理が必要になる。請求テーブルとの二重管理でデータ整合性の担保が複雑になる |
| **Why not** | Single Source of Truth（請求テーブル）を維持することが整合性管理のコストを大幅に下げる。売上の再計算が常に最新状態を反映するため、データ修正時の運用手順が不要になる |

---

### D2: 集計クエリ専用リポジトリ（revenueRepository）を独立して新設する

**Decision**: `src/infrastructure/repositories/revenueRepository.ts` を新設し、月次集計・顧客別集計・案件別集計・パイプライン集計の 4 クエリを配置する。既存の `invoiceRepository`・`dealRepository` には手を加えない。また、`revenue_targets` の CRUD 操作は `revenueTargetRepository`（別ファイル）に分離する。

#### Alternative 1: invoiceRepository に集計メソッドを追加

| | |
|---|---|
| **Pros** | ファイル数が増えない |
| **Cons** | invoice の CRUD（単票操作）と売上集計（JOIN + GROUP BY + SUM）は利用ユースケースが異なる。`invoiceRepository` の責務が肥大化し、テスタビリティと可読性が下がる |
| **Why not** | 集計クエリは複数テーブルにまたがる複合 SQL であり、CRUD リポジトリの責務とは性質が異なる |

#### Alternative 2: ユースケース層で複数リポジトリを呼び出して集計

| | |
|---|---|
| **Pros** | リポジトリの粒度を細かく保てる |
| **Cons** | SQL の SUM/GROUP BY を活用できず、全 invoice をメモリに取得して集計する N+1 相当の処理になる。データ量増加で深刻なパフォーマンス問題を招く |
| **Why not** | SQL 集計関数による効率的な処理は DB 層で行うべき。ユースケース層での集計はアンチパターン |

---

### D3: 売上実績の帰属月は paidAt（入金確認日）を基準とする

**Decision**: 月次集計の帰属月は `invoices.paidAt` の月で判定する。`issueDate`（請求日）・`dueDate`（支払期限）は使用しない。集計クエリで `DATE_TRUNC('month', paid_at)` を使用し UTC ベースで集計する。

#### Alternative 1: issueDate（請求日）基準

| | |
|---|---|
| **Pros** | 請求書発行タイミングと一致するため経理上の予定管理に適している |
| **Cons** | 請求と入金のタイミングのずれで「請求済みだが未回収」の金額が売上実績として計上されてしまう |
| **Why not** | 売上実績は「入金確認済み」金額の集計であるという要件に反する |

#### Alternative 2: dueDate（支払期限）基準

| | |
|---|---|
| **Pros** | 期限を計画値として使いやすい |
| **Cons** | 期限超過（遅延入金）の場合に実績と乖離する |
| **Why not** | 実際の入金タイミングとずれるため、実績管理としての正確性が失われる |

---

### D4: パイプライン集計の対象を非終端フェーズ（won / lost を除外）に限定する

**Decision**: パイプライン売上予測の集計対象フェーズを `proposal_prep`・`proposed`・`negotiation` の 3 フェーズとする。`won`（受注済）と `lost`（失注）は集計から除外する。

#### Alternative 1: won フェーズをパイプライン集計に含める

| | |
|---|---|
| **Pros** | 受注済みで未請求の案件金額も予測に反映できる |
| **Cons** | `won` の案件は既に契約として管理されており、入金後は `invoices` の実績に反映される。パイプライン予測に含めると実績集計と二重計上になる |
| **Why not** | 実績（invoices）とパイプライン予測の集計が重複し、ダッシュボードの合計数値が過大になるため |

---

### D5: estimatedAmount が NULL の案件はパイプライン集計に COALESCE(0) で含める

**Decision**: パイプライン集計クエリで `COALESCE(estimated_amount, 0)` を使用し、NULL を 0 として集計する。金額未定の案件は件数としてカウントされるが、金額合計への寄与は 0 になる。

#### Alternative 1: NULL の案件を集計対象から除外する

| | |
|---|---|
| **Pros** | 金額が確定した案件のみで予測を構成するため、予測値の信頼性が高くなる |
| **Cons** | 金額未定の案件が存在するフェーズの件数が実態より少なく表示される。フェーズ別の案件数を見て営業活動を管理する用途での正確性が損なわれる |
| **Why not** | 案件がパイプラインに存在すること自体が見通しとして意味を持つ。件数の正確性を優先し、金額未定は 0 として表現する |

---

### D6: revenue エンティティを PERMISSION_MATRIX に追加し目標設定を admin/manager に限定する

**Decision**: `src/domain/authorization.ts` の `PERMISSION_MATRIX` に `revenue` エンティティを追加する。
- `revenue.view`: `admin | manager | finance | member`（全ロール許可）
- `revenue.setTarget`: `admin | manager`（目標設定は経営判断）
- `revenue.export`: `admin | manager | finance`（CSV エクスポートは経理担当も許可）

#### Alternative 1: finance ロールにも目標設定（setTarget）を許可する

| | |
|---|---|
| **Pros** | 経理担当が予算計画に基づいて目標を直接入力できる |
| **Cons** | 目標設定は経営判断に近く、経理担当（finance）が独断で設定すべき操作ではない。承認ワークフローなしに finance が目標を変更できると、経営層の意図と乖離したターゲットが設定されるリスクがある |
| **Why not** | 目標設定は管理職（admin / manager）の責任範囲と判断。finance は閲覧と CSV エクスポートに留める |

---

### D7: CSV エクスポートは Route Handler パターンで実装する

**Decision**: `src/app/api/revenue/export/route.ts` に GET ハンドラとして実装する。既存の `src/app/api/audit-logs/export/route.ts` と同じパターン（BOM 付き UTF-8・`escapeCsvValue` によるインジェクション対策）を踏襲する。

#### Alternative 1: Server Action で Blob を返す

| | |
|---|---|
| **Pros** | Server Action と統一できる |
| **Cons** | Server Action は JSON レスポンスの設計であり、バイナリダウンロードには不向き。`Content-Disposition: attachment` を返すには Route Handler が適切 |
| **Why not** | Next.js の Route Handler が CSV ダウンロードのユースケースに最適。既存パターンの再利用でコードの一貫性も維持できる |

---

## Consequences

### Positive

- 売上実績の Single Source of Truth が `invoices` テーブルに保たれる。請求データの修正が即座に集計結果に反映され、整合性管理のオーバーヘッドが不要
- 集計リポジトリパターン（JOIN + GROUP BY 専用）がコードベースに確立された。将来の同様な読み取り集計モジュールの設計先例になる
- 権限マトリクスに `revenue` エンティティが追加され、ADR-012 の deny-by-default パターンが売上ドメインにも適用される

### Negative / Trade-offs

- **集計クエリのスケーリング**: `invoices` テーブルのレコード数が増加すると、月次集計（JOIN + GROUP BY + SUM）が遅くなる。初期実装はリアルタイム集計で十分だが、将来的に `(organization_id, status, paid_at)` インデックスの追加やマテリアライズドビューの導入が必要になる可能性がある
- **タイムゾーン**: `paidAt` は UTC 保存・UTC 基準で月次集計する。タイムゾーンをまたぐ組織（例: 日本法人が米国基準で集計したい場合）には対応しない。本スコープ外

### Known Design Debt

- **予実管理の per-target actual 計算**: `getRevenueForecast` ユースケースで複数の売上目標が存在する場合、各目標の `actualAmount` をその目標の `periodStart`〜`periodEnd` でフィルタして算出する必要がある（review-feedback-001 finding #1）。この計算が全期間合計で共有されると進捗率が不正確になる。修正パターン: `monthlyRevenue.filter(m => targetPeriodContains(m.yearMonth, target)).reduce(...)` で per-target actual を算出する

### Constraints for future changes

- **売上実績の追加集計クエリ**: 新しい集計クエリ（例: 担当者別・地域別）は `revenueRepository` に追加する。CRUD 操作は `revenueTargetRepository` に配置し、両リポジトリの責務を混在させない
- **売上ドメインの新操作**: 新しい操作（例: `revenue.approveTarget`）を追加する際は、`PERMISSION_MATRIX` の `revenue` エンティティに登録してから `canPerform` を呼び出すこと（ADR-012 の deny-by-default 制約）
- **パイプライン集計のフェーズ変更**: `dealPhaseEnum` に新フェーズが追加された場合、`revenueRepository` の `getPipelineSummary` クエリの除外フェーズリスト（`["won", "lost"]`）を見直すこと
- **売上目標の期間重複チェック**: `revenue_targets` の `period_start`/`period_end` 重複チェックはアプリ層（`setRevenueTarget` usecase）で実装されている。DB 制約は存在しないため、新しい書き込みパスを追加する場合は必ず重複チェックを呼び出すこと

---

## References

- `specrunner/changes/revenue-module/design.md` — 詳細設計（D1〜D9）
- `specrunner/changes/revenue-module/request.md` — 要件定義
- `specrunner/changes/revenue-module/spec.md` — ビヘイビア仕様
- `specrunner/changes/revenue-module/review-feedback-001.md` — コードレビュー指摘
- `src/infrastructure/repositories/revenueRepository.ts` — 集計専用リポジトリ実装
- `src/infrastructure/repositories/revenueTargetRepository.ts` — revenue_targets CRUD 実装
- `src/application/usecases/getRevenueDashboard.ts`, `getRevenueDetails.ts`, `getRevenueForecast.ts` — 集計ユースケース
- `src/app/api/revenue/export/route.ts` — CSV エクスポート Route Handler
- `src/domain/authorization.ts` — revenue エンティティの PERMISSION_MATRIX 定義
- `specrunner/adr/ADR-012-authorization-centralization.md` — canPerform パターン（本 ADR が踏襲）
