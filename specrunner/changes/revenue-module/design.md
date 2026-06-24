# Design: 売上モジュールの実装

## Context

売上管理はシステムの最終目的の一つだが、画面・ロジックが未実装。既存の契約（`contracts`）と請求（`invoices`）のデータを集計元として売上実績の可視化、パイプラインベースの売上予測、予実管理を行うモジュールを新設する。

R05（契約・請求モデル強化）が完了済みであり、以下の前提が成立している:

- `contracts.amount` は NOT NULL（`integer("amount").notNull()`）
- `invoices.issue_date` カラムが存在する
- `invoices.due_date` は NOT NULL
- 請求の `status = "paid"` かつ `paidAt` が設定されているものが売上実績の元データ

既存ドメインモデル:

- `Invoice`（`src/domain/models/invoice.ts`）: `status: InvoiceStatus`, `paidAt: Date | null`, `amount: number`
- `Contract`（`src/domain/models/contract.ts`）: `amount: number`, `clientId: string`, `dealId: string`
- `Deal`（`src/domain/models/deal.ts`）: `phase: DealPhase`, `estimatedAmount: number | null`
- `DealPhase`: `"proposal_prep" | "proposed" | "negotiation" | "won" | "lost"`

既存インフラ:

- `invoiceRepository` にはステータス別や期間別のクエリが存在しない（CRUD + `sumAmountByContract` のみ）
- `dealRepository` にはフェーズ別集計クエリが存在しない
- CSV エクスポートの既存パターン: `src/app/api/audit-logs/export/route.ts`（Route Handler + `escapeCsvValue`）
- 認可: `src/domain/authorization.ts` の `canPerform(role, entity, operation)` パターン
- ナビゲーション: `src/app/(dashboard)/layout.tsx` に Link コンポーネントを追加する方式

## Goals / Non-Goals

**Goals**:

- 売上集計リポジトリ（`revenueRepository`）を新設し、月次・顧客別・案件別の売上集計とパイプライン集計を SQL クエリで実装する
- `revenue_targets` テーブルを新設し、期間ごとの売上目標を管理する
- `/revenue`（ダッシュボード）、`/revenue/details`（売上明細）、`/revenue/forecast`（予実管理）の 3 ページを新設する
- 売上明細の CSV エクスポートエンドポイントを Route Handler として実装する
- ナビゲーションに「売上」リンクを追加する
- 認可マトリクスに `revenue` エンティティを追加する

**Non-Goals**:

- 売上予測のフェーズ別重み付け（フェーズごとの受注確率）
- 目標金額の承認ワークフロー
- グラフの描画ライブラリの選定（データ提供のみ、グラフはクライアントコンポーネントで実装）
- パフォーマンス最適化（マテリアライズドビュー等）— 初回はリアルタイム集計で実装

## Decisions

### D1: 売上は読み取り専用ドメインとして実装する（architect 評価済み）

**選択**: 独自のエンティティは `revenue_targets` のみ。売上実績は契約・請求のデータを集計するクエリで算出する。`revenueRepository` は集計クエリ専用であり、売上レコードの INSERT/UPDATE は行わない。
**却下案**: 売上レコードテーブル — 請求の入金確認時に売上レコードを作成する方式。データの整合性管理が複雑になり、請求ステータスの変更と売上レコードの同期が必要になる。

**Rationale**: データの二重管理を避ける。請求テーブルが Single Source of Truth であり、集計クエリで常に最新の状態を取得できる。

### D2: revenueRepository を集計クエリ専用リポジトリとして新設する

**選択**: `src/infrastructure/repositories/revenueRepository.ts` に集計専用のクエリ関数群を配置する。既存の `invoiceRepository` や `dealRepository` には手を加えない。
**却下案A**: `invoiceRepository` に集計メソッドを追加する — 責務の肥大化。invoice の CRUD と売上集計は異なるユースケース。
**却下案B**: usecase 内で複数リポジトリを呼び出して集計する — SQL の集計関数（SUM, GROUP BY）を活用できず、N+1 問題やメモリ効率の悪化が発生する。

**Rationale**: SQL の集計関数を活用した効率的なクエリを実装するには、専用リポジトリとして JOIN + GROUP BY を含む複合クエリを定義するのが最適。既存リポジトリの責務を変えない。

### D3: パイプライン集計の対象フェーズは非終端フェーズ（won / lost を除外）とする

**選択**: `proposal_prep`, `proposed`, `negotiation` の 3 フェーズを集計対象とする。`won` は契約済みのため実績に移行済み、`lost` は失注のため予測に含めない。
**却下案**: `won` を含めてパイプライン集計する — 契約済み案件の金額が実績と二重計上される。

**Rationale**: request-review Finding #2 で指摘されたとおり、`won` の案件は既に契約として管理されており、パイプライン予測に含めると二重計上となる。

### D4: estimatedAmount が NULL の案件はパイプライン集計で 0 として扱う

**選択**: `COALESCE(estimated_amount, 0)` で NULL を 0 に変換して集計する。件数には含めるが金額には寄与しない。
**却下案**: NULL の案件を集計対象から除外する — 件数の正確性が損なわれる。

**Rationale**: request-review Finding #3 で指摘された NULL の扱い。案件がパイプラインに存在すること自体は件数として意味があり、金額未定の案件を除外するとパイプライン全体の見通しが悪くなる。

### D5: 目標金額の設定・編集は admin / manager ロールに限定する

**選択**: 認可マトリクスに `revenue` エンティティを追加し、目標の write 操作（`setTarget`）を `admin` と `manager` に限定する。read 操作（`view`）は全ロールに許可する。
**却下案**: finance ロールにも目標設定を許可する — 目標設定は経営判断に近く、経理担当が独断で設定すべきではない。

**Rationale**: request-review Finding #1 で指摘されたアクセス制御の明示化。既存の認可パターンに合わせ、`PERMISSION_MATRIX` に `revenue` エンティティを追加する。

### D6: revenue_targets テーブルに updatedAt を追加する

**選択**: プロジェクトの他の mutable テーブル（`contracts`, `invoices`, `deals` 等）と同様に `updatedAt` カラムを持たせる。
**却下案**: `updatedAt` なしで最小スキーマにする — プロジェクトの慣例と不整合になる。

**Rationale**: request-review Finding #4 の指摘に対応。目標金額は編集可能なエンティティであり、更新日時の記録は監査と運用の観点から必要。

### D7: CSV エクスポートは Route Handler パターンで実装する

**選択**: `src/app/api/revenue/export/route.ts` に GET ハンドラとして実装する。既存の `src/app/api/audit-logs/export/route.ts` と同じパターン（BOM 付き UTF-8、`escapeCsvValue` によるインジェクション対策）を踏襲する。
**却下案**: Server Action で Blob を返す — Server Action は FormData → JSON レスポンスの設計であり、バイナリダウンロードには不向き。

**Rationale**: Next.js の Route Handler は Response オブジェクトを直接返せるため、CSV ダウンロードに適している。既存実装の `escapeCsvValue` をそのまま再利用する。

### D8: 売上集計の基準日は paidAt（入金確認日）とする

**選択**: 月次集計の帰属月は `paidAt` の月で判定する。`issueDate` や `dueDate` ではなく、実際の入金確認日を基準とする。
**却下案A**: `issueDate`（請求予定日）基準 — 請求と入金のタイミングのずれで実績が不正確になる。
**却下案B**: `dueDate`（支払期限）基準 — 期限までに入金されない場合に実績と乖離する。

**Rationale**: 売上実績は「入金確認済み」の金額を集計する要件であり、`paidAt` が最も正確な基準。`status = "paid"` の条件と合わせて、入金確認済みの請求のみを集計対象とする。

### D9: revenueTargetRepository を CRUD 専用リポジトリとして新設する

**選択**: `src/infrastructure/repositories/revenueTargetRepository.ts` に `revenue_targets` テーブルの CRUD 操作を配置する。`revenueRepository`（集計クエリ専用）とは分離する。
**却下案**: `revenueRepository` に統合する — 集計クエリと CRUD の責務が混在する。

**Rationale**: 集計クエリ（読み取り専用、JOIN + GROUP BY）と CRUD（単一テーブル操作）は性質が異なる。責務を分離することで、各リポジトリの可読性とテスタビリティを維持する。

## Migration Plan

1. `src/infrastructure/schema.ts` に `revenueTargets` テーブル定義を追加する
2. `bun run db:generate` でマイグレーション SQL を生成する
3. 生成されたマイグレーションは単純な CREATE TABLE のため、手動編集は不要
4. ロールバック: `DROP TABLE revenue_targets;` — 他テーブルへの FK がないため安全に削除可能

## Risks / Trade-offs

**[Risk]** 集計クエリがデータ量に比例して遅くなる（JOIN + GROUP BY + SUM）
→ **Mitigation**: 初期段階ではリアルタイム集計で十分。データ量が増加した際にインデックス追加やマテリアライズドビューの導入を検討する。`invoices` テーブルの `(organization_id, status, paid_at)` にインデックスが将来必要になる可能性がある。

**[Risk]** 月次集計の期間境界でタイムゾーンの扱いが不正確になる
→ **Mitigation**: `paidAt` は UTC で保存される。集計クエリでは `DATE_TRUNC('month', paid_at)` を使用し、サーバー側で UTC ベースの月次集計を行う。クライアント側でのタイムゾーン変換は本モジュールのスコープ外とする。

**[Risk]** revenue_targets の period_start / period_end の重複チェックが DB 制約のみでは不完全
→ **Mitigation**: アプリ層（usecase）で期間重複チェックを実装する。同一組織内で period_start と period_end が重複する目標を拒否する。

## Open Questions

なし — request-review の findings に対する方針は本設計で解決済み。
