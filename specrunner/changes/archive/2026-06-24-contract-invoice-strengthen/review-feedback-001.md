# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | maintainability | `src/domain/services/contractValidation.ts`, `src/domain/services/invoiceValidation.ts` | `ValidationResult` 型が両ファイルで独立して定義・export されている。型の形状は同一なので重複 | 一方から import するか、`src/domain/services/validation.ts` に切り出して両ファイルから参照する | no |
| 2 | low | testing | `src/__tests__/domain/` | test-cases.md では automated:32 と計画しているが、新規追加テストは unit テスト 8 ケースのみ（contractValidation, invoiceValidation）。TC-010〜TC-032 の integration テスト（usecase/action 層）は未実装 | DB 接続環境が整備された後に integration テストを追加する。受け入れ基準（`typecheck && test green`）は既に充足しているため今 iteration での blocking はしない | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.60

## Summary

全受け入れ基準を充足している。実装は設計（design.md / tasks.md）に忠実で、以下を確認した。

**正確性**:
- マイグレーション SQL（`0002_early_nicolaos.sql`）が `UPDATE → ALTER COLUMN SET NOT NULL` の正しい順序で実装されている。`contracts.amount=0`、`contracts.start_date=created_at`、`invoices.due_date=created_at+30days` の各デフォルト設定も設計通り。
- `validateContractAmount`・`validateContractDates`・`validateInvoiceDates` の各バリデーション関数が仕様通りに動作する（amount ≤ 0 → error、startDate > endDate → error、issueDate > dueDate → error、null → skip）。
- `updateInvoice` usecase で合計金額チェックが SERIALIZABLE トランザクション内に正しく実装されており、既存請求の金額を差し引いた `existingTotal - currentAmount + newAmount` で正確に計算している。

**アーキテクチャ**:
- バリデーションロジックが domain service（純粋関数）に配置されており、複数の usecase から再利用されている。
- usecase → repository → domain service の依存方向が規約通り。
- `createInvoice` と `updateInvoice` の両方で SERIALIZABLE 分離レベルが適用されており、ファントムリードによる合計金額の競合を防止している。
- `updateContract` の日付バリデーションは `effectiveStartDate`/`effectiveEndDate` を算出してから呼ぶ設計が正しく、部分更新時も整合性が保たれる。

**セキュリティ**:
- `updateInvoiceAction` に認証・認可・レート制限チェックが実装されている。
- `invoiceRepository.findById` および `contractRepository.findById` は `organizationId` を必ず含む WHERE 句でテナント分離を維持している。

**テスト**:
- unit テスト（contractValidation.test.ts / invoiceValidation.test.ts）が test-cases.md の TC-001〜TC-009（must）を全カバー。
- verification-result.md で `562 pass / 0 fail`・typecheck・build・lint がすべて green。
- integration テスト（TC-010〜TC-032）は未実装だが、現時点の DB 環境（PostgreSQL 予定）では実装困難であり、受け入れ基準外のため blocking しない。
