# Domain Invariants Review Result — invoice-management — iter 1

<!-- Reviewer: domain-invariants
     Purpose: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
-->

- **verdict**: approved

## Review Scope

| 観点 | 検証内容 |
|------|---------|
| テナント分離 | 全リポジトリクエリの organizationId 条件、Server Actions のセッション由来 organizationId 伝播 |
| 監査ログ完全性 | 全ミューテーション操作での auditLogRepository.create 呼び出し、トランザクション内配置 |
| 承認ワークフロー不変条件 | 既存承認フローコードへの影響、Invoice ドメインとの分離 |
| 状態遷移不変条件 | 新規 InvoiceStatus FSM の終端状態保護、遷移定義の正確性 |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | 並行性 | `src/application/usecases/createInvoice.ts:33` | `sumAmountByContract` と `create` は同一トランザクション内で実行されており単純な競合は防止している。しかし PostgreSQL デフォルトの READ COMMITTED では、2つの並行トランザクションが互いのコミット前に同一 SUM を読み取り、両者ともチェックを通過して insert する phantom read がなお残る。one_time 契約の金額上限が財務的な不変条件であれば、合計額が `contract.amount` を超える可能性が理論上存在する。本件は spec-review-result-002 の Finding #1（MEDIUM）と同一事象であり、spec-review で「実装フェーズで判断可」と判定済み。 | `db.transaction` 内で `contractRepository.findById(contractId, organizationId, tx)` を再取得し Drizzle の `.for("update")` で contracts 行をロックする。またはリスクとして設計書に明示し次期フェーズで対応する。 |
| 2 | LOW | テスト網羅 | `src/__tests__/static/projectStructure.test.ts:139` | TC-034（domain 層に infrastructure import がない静的検証）の対象ファイルリストに `domain/services/invoiceTransition.ts` と `domain/models/invoice.ts` が含まれていない。実装上はいずれも infrastructure import を持たないため機能的問題はないが、将来の変更で誤って import が追加されても静的検証が検出しない。 | TC-034 の対象リストに `"domain/services/invoiceTransition.ts"` と `"domain/models/invoice.ts"` を追加する。 |

## Invariant Verification Summary

### テナント分離

- **invoiceRepository 全6メソッド**: `create`, `findById`, `findAllByContract`, `update`, `updateStatus`, `sumAmountByContract` すべての WHERE 条件に `organizationId` が含まれていることを確認 ✅
- **createInvoice UC**: `contractRepository.findById(contractId, organizationId)` で契約の組織帰属を検証してから請求作成。別テナントの contractId を指定しても contract が null を返してエラーになる ✅
- **updateInvoiceStatus UC**: `invoiceRepository.findById(invoiceId, organizationId)` で請求の組織帰属を検証 ✅
- **Server Actions**: 全 action で `session.user.organizationId` を使用。外部から organizationId を注入できない ✅
- **InvoiceSection.tsx**: Server Component として Page から受け取る `organizationId`（セッション由来）を `findAllByContract` に渡す。Page 側で `contractRepository.findById(id, organizationId)` 済みの `contract.id` を使用するため cross-tenant アクセス不可 ✅

### 監査ログ完全性

- **createInvoice**: `auditLogRepository.create({ action: "invoice.create", targetType: "invoice", targetId: newInvoice.id, actorId, organizationId })` をトランザクション内で実行。請求作成とログ記録がアトミック ✅
- **updateInvoiceStatus**: `auditLogRepository.create({ action: "invoice.update_status", ... })` をトランザクション内で実行 ✅
- **listInvoicesByContract**: 読み取りのみ。監査ログ不要 ✅
- **権限制御**: `createInvoiceAction` / `updateInvoiceStatusAction` は admin / manager のみ実行可能。`actorId` は session から取得するため偽装不可 ✅

### 承認ワークフロー不変条件

- 既存の承認ワークフロー関連ファイル（`requests`, `approvalSteps`, `approvalTemplates`, `requestTransition.ts`, `approvalStepService.ts`）はいずれも変更されていない ✅
- `contractsRelations` に `invoices: many(invoices)` が追加されたが、既存 relation の変更・削除なし ✅
- `organizationsRelations` に `invoices: many(invoices)` が追加されたが、既存 relation は維持 ✅
- Invoice ドメインと承認ワークフローは state 共有なし。`request.md` でも「請求と承認ワークフローの連携」はスコープ外として明示 ✅

### InvoiceStatus 状態遷移不変条件

- `VALID_INVOICE_TRANSITIONS` の定義: `scheduled → ["invoiced"]`, `invoiced → ["paid", "overdue"]`, `paid → []`, `overdue → []` ✅
- 終端状態（paid / overdue）の空配列により、あらゆる遷移要求が `{ ok: false }` を返す ✅
- `validateInvoiceTransition` は純粋関数（副作用・infrastructure import なし）✅
- テスト TC-001〜TC-006 で許可遷移3件・拒否遷移3件を網羅 ✅
