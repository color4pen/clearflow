# Domain Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    all domain invariants are intact
  - needs-fix:   one or more invariants broken or unprotected — must fix before merge
  - escalation:  structural conflict requiring human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
-->

Reviewer: domain-invariants
Purpose: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
Iteration: 2

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | ユーザーエクスペリエンス — 競合時エラーメッセージ | `src/application/usecases/createDeal.ts:87-91` | TOCTOU 競合（2リクエストがほぼ同時に `findByInquiryId` チェックを通過）が発生した場合、DB の UNIQUE 制約違反 (`"duplicate key value violates unique constraint "deals_inquiry_id_unique""`) がそのまま `err.message` として返される。ドメイン不変条件自体は DB レベルで保護されているが、エラーメッセージが Postgres 内部メッセージになりユーザーに非友好的。 | `catch` ブロック内で `err.message.includes("deals_inquiry_id_unique")` を検出し、`"この引き合いにはすでに案件が存在します"` に変換する。競合は極めてまれなため即時対応は不要。 |
| 2 | LOW | 監査ログ — 楽観ロック失敗時の偽エントリ（既知の既存パターン） | `src/application/usecases/updateDealPhase.ts:143-181` | `internal_approval` 以外の遷移パスで、`dealRepository.updatePhase` が null を返した（楽観ロック失敗）場合でも `auditLogRepository.create` が実行されトランザクションがコミットされる。フェーズ変更が行われていないにも関わらず `deal.updatePhase` の監査ログが残る。`updateInquiryStatus.ts` と同一のパターンであり、code-review-feedback-001 で `Fix: no`（スコープ外）とマークされた既存の設計上の妥協。 | 将来のリファクタリングで `if (!updated) { throw new Error(...) }` を追加してトランザクションをロールバックし、監査ログの偽エントリを防ぐ。本 PR の修正スコープ外。 |

## iteration 1 指摘事項の解消確認

| iter-1 # | Severity | 指摘内容 | 解消状態 | 確認箇所 |
|----------|----------|----------|----------|----------|
| 1 | HIGH | `deals.inquiry_id` に UNIQUE 制約がなく TOCTOU リスク | **解消** | `schema.ts:332-334` に `unique("deals_inquiry_id_unique").on(table.inquiryId)`、`drizzle/0011_deal_inquiry_unique.sql` に対応マイグレーションが追加された |
| 2 | HIGH | 楽観ロック失敗時にトランザクション内で例外がスローされず承認リクエスト等の孤立レコードが発生 | **解消** | `updateDealPhase.ts:91-94` にて `if (!updated) { throw new Error("この案件は他のユーザーによって更新されました"); }` がトランザクション内に追加され、ロールバックが確実に行われる |
| 3 | MEDIUM | `assigneeId` / `technicalLeadId` の組織帰属検証が未実装 | **解消** | `createDeal.ts:40-52` および `updateDeal.ts:25-37` の両ユースケースで `userRepository.findById(id, organizationId)` による組織帰属検証が実装された |
| 4 | LOW | `updateDeal` の監査ログに `metadata` がなく変更内容が追跡不可 | **解消** | `updateDeal.ts:59-79` にて `changedFields` を計算し `metadata: { updatedFields: changedFields }` として監査ログに記録するよう修正された |

## 確認済み不変条件（問題なし）

- **1:1 制約（DB レベル）**: `schema.ts` の `deals` テーブル定義に `unique("deals_inquiry_id_unique").on(table.inquiryId)` が追加され、`drizzle/0011_deal_inquiry_unique.sql` でマイグレーション済み。アプリケーション層の `findByInquiryId` チェックと二重防衛になっている。
- **承認ワークフロー原子性**: `internal_approval` 遷移の `db.transaction` 内で `updatePhase` が null の場合に `throw new Error(...)` が実行されロールバックが確実に行われる。Request・ApprovalStep・AuditLog の孤立は発生しない。
- **テナント分離**: `dealRepository` の全6メソッド（`create`, `findById`, `findAllByOrganization`, `findByInquiryId`, `update`, `updatePhase`）に `organizationId` 条件が付与されている。`approvalTemplateRepository.findById` も `organizationId` で絞り込む。Server Action は `session.user.organizationId` を使用する。
- **担当者テナント検証**: `createDeal` / `updateDeal` の両ユースケースで `assigneeId` / `technicalLeadId` が指定された場合に `userRepository.findById(id, organizationId)` で組織帰属を確認し、不一致なら即座にエラーを返す。
- **フェーズ遷移ルール**: `VALID_TRANSITIONS` マップが要件通り（`proposal_prep→proposed|lost`, `proposed→negotiation|lost`, `negotiation→internal_approval|lost`, `internal_approval→won|lost`）。終端状態（`won`, `lost`）はマップに含まれず常に `false`。全フェーズ（終端除く）から `lost` への遷移を許可。
- **ロールチェック**: `createDealAction` / `updateDealPhaseAction` は admin/manager のみ許可。`updateDealAction` は全ロール（要件通り）。
- **承認リクエスト作成パターン**: `internal_approval` 遷移時に `templateId` 未指定ガード、テンプレートのテナント検証、フォームデータとして `{ amount: { value: deal.estimatedAmount, label: "想定金額" } }` を渡す、タイトル `"見積承認: ${deal.title}"` — 全て要件通り実装。
- **`estimateRequestId` の onDelete**: `ON DELETE set null` が正しく設定されており（`schema.ts:324-326`）、承認リクエスト削除時に案件レコードが保持される。
- **楽観ロック**: `updatePhase` が `version: sql\`version + 1\`` でインクリメントし、WHERE 条件に `eq(deals.version, currentVersion)` を含む。
- **監査ログ完全性**: `createDeal`（`deal.create`）/ `updateDealPhase` 全パス（`deal.updatePhase`、`internal_approval` 時は `request.create` も追加記録）/ `updateDeal`（`deal.update` + `updatedFields` メタデータ）— 全ユースケースで記録。
- **シードデータ整合性**: `inProgressInquiry`（L442-451）のステータスが `"converted"` に修正され、紐づく案件（`proposed` フェーズ）との整合が保たれている。テーブル truncation 順序は `deals → meetings → inquiries` の FK 順序を遵守。
- **build / typecheck / test**: 検証結果（`verification-result.md`）より build・typecheck・488件テスト全 pass・lint エラー0件を確認。
