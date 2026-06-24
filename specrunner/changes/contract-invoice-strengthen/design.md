# Design: 契約・請求モデルの強化

## Context

売上管理の基盤として契約金額と請求日の管理が必要だが、現状のスキーマとバリデーションに以下の不備がある:

- `contracts.amount` が nullable — 売上集計の起点にならない
- `contracts.start_date` が nullable — 契約期間の管理が不完全
- `invoices` テーブルに `issue_date` カラムがない — 請求予定日と発行処理日時を区別できない
- `invoices.due_date` が nullable — 支払期限が不確定な請求が存在しうる
- 契約金額の正値チェックがない — amount = 0 や負値の契約を作成できる
- 日付の整合性チェックがない — startDate > endDate の契約や issueDate > dueDate の請求が可能
- 請求金額の合計チェックが `createInvoice` のみ — 請求更新時にチェックが適用されない

既存の型定義:
- `Contract.amount: number | null`（`src/domain/models/contract.ts:12`）
- `Contract.startDate: Date | null`（同:13）
- `Invoice.dueDate: Date | null`（`src/domain/models/invoice.ts:9`）
- `Invoice` に `issueDate` フィールドなし

既存の Server Action:
- `createContractSchema` で `amount` は `z.coerce.number().int().nonnegative().optional()`（0 を許容）
- `createInvoiceSchema` で `dueDate` は `z.string().optional()`

## Goals / Non-Goals

**Goals**:

- `contracts.amount` と `contracts.start_date` を NOT NULL に変更し、既存データをマイグレーションで安全に移行する
- `invoices` テーブルに `issue_date`（請求予定日）カラムを追加する
- `invoices.due_date` を NOT NULL に変更する
- 契約の作成・更新時に amount > 0 と startDate ≤ endDate のアプリ層バリデーションを追加する
- 請求の作成・更新時に issueDate ≤ dueDate のアプリ層バリデーションを追加する
- 請求金額の合計チェックを請求の金額更新時にも適用する

**Non-Goals**:

- 売上集計ロジック（後続リクエスト R09 のスコープ）
- 請求画面の独立化（後続リクエスト R10 のスコープ）
- DB レベルの CHECK 制約（アプリ層検証を優先、既存データとの互換性のため）

## Decisions

### D1: マイグレーションで既存 null データにデフォルト値を設定してから NOT NULL 制約を追加する

**選択**: 2 ステップマイグレーション — UPDATE で null を埋める → ALTER COLUMN SET NOT NULL
**却下**: DEFAULT 付き ALTER（データ量が多い場合のロック問題、既存データの意味的な正しさが保証できない）

**Rationale**: Drizzle の `generate` で生成されるマイグレーション SQL に手動で UPDATE 文を挿入する。`contracts.amount` の null は 0 に、`contracts.start_date` の null は `created_at` の値に設定する。`invoices.due_date` の null は `created_at + 30 days` に設定する（支払期限の一般的なデフォルト）。マイグレーション後に amount = 0 の契約が残るが、これは過去データとして許容する。新規作成・更新時のみ amount > 0 を強制する。

### D2: バリデーション関数をドメインサービスとして追加する

**選択**: `src/domain/services/contractValidation.ts` と `src/domain/services/invoiceValidation.ts` に純粋関数として追加
**却下**: usecase 内に直接バリデーションロジックを記述する方式

**Rationale**: レイヤードアーキテクチャの規約に従い、ビジネスルールは domain 層に配置する。複数の usecase（create/update）から呼び出されるため、domain service として共有する。純粋関数であり副作用を持たないため、テストが容易。

### D3: issueDate と invoicedAt を分離する（architect 評価済み）

**選択**: `issueDate` を「請求予定日」（事前に設定可能、nullable）として新設。既存の `invoicedAt` は「発行処理の実行日時」（ステータス遷移時に記録）として維持。
**却下案 A**: issueDate で統一 — 発行処理のタイムスタンプが失われる
**却下案 B**: invoicedAt のみ — 請求予定日が管理できない

**Rationale**: 請求予定日と発行処理日時は異なるビジネス概念。予定日は事前計画で使い、発行日時は実際の処理記録として監査証跡に必要。

### D4: 請求金額の合計チェックを updateInvoice usecase で適用する

**選択**: `updateInvoice` usecase を新規作成し、金額変更時に合計チェックを実施する。`createInvoice` と同じ SERIALIZABLE 分離レベルのトランザクション内で SUM → UPDATE を原子的に実行する。
**却下**: `updateInvoiceStatus` に金額変更機能を追加する方式

**Rationale**: request-review の Finding #1 で指摘されたとおり、`updateInvoiceStatus` は amount を変更しない。金額・タイトル・日付等のフィールド更新は独立した `updateInvoice` usecase で行うのが責務分離の観点から適切。`invoiceRepository.update` は既に amount を含む部分更新に対応済み。

### D5: NOT NULL 変更に伴う型・バリデーション層のカスケード更新

**選択**: `Contract.amount` を `number`（非 nullable）に、`Contract.startDate` を `Date`（非 nullable）に変更し、関連する usecase・action・repository の型定義を一括更新する。
**却下**: 型をそのまま（nullable）にしてランタイムチェックのみ追加する方式

**Rationale**: TypeScript の型安全性を活用し、nullable → non-nullable 変更をコンパイル時に検証する。Schema → domain model → repository → usecase → action の順で型を伝播させることで、変更漏れを防ぐ。

## Migration Plan

1. `drizzle-kit generate` でマイグレーション SQL のスケルトンを生成する
2. 生成された SQL を編集し、各 NOT NULL 変更の前に UPDATE 文を挿入する:
   - `UPDATE contracts SET amount = 0 WHERE amount IS NULL;`
   - `UPDATE contracts SET start_date = created_at WHERE start_date IS NULL;`
   - `UPDATE invoices SET due_date = created_at + INTERVAL '30 days' WHERE due_date IS NULL;`
3. `issue_date` カラムの追加は nullable のため、そのまま ALTER TABLE ADD COLUMN で対応
4. ロールバック: マイグレーションを revert し、カラムを nullable に戻す。デフォルト値で埋めたデータは情報損失なし（元が null なので）

## Risks / Trade-offs

**[Risk]** マイグレーション後に amount = 0 の契約が残り、update 時に amount > 0 バリデーションでエラーになる
→ **Mitigation**: amount を変更しない update（タイトル変更等）ではバリデーションをスキップする。amount フィールドが更新対象に含まれる場合のみ > 0 チェックを適用する。

**[Risk]** `invoices.due_date` の null データに `created_at + 30 days` を設定することで、過去のデータに不正確な支払期限が付与される
→ **Mitigation**: 過去データの正確性よりもスキーマの NOT NULL 制約を優先する。30 日は一般的な支払期限であり、過去データの利用頻度は低い。

**[Risk]** `updateInvoice` usecase の新規作成で既存の `invoiceRepository.update` の利用パターンが変わる
→ **Mitigation**: repository の既存インターフェースは変更しない。usecase が repository を呼ぶ前にバリデーションを挟む設計とする。

## Open Questions

なし — architect により設計判断が評価済みであり、request-review の findings に対する方針も本設計で解決済み。
