# Regression Gate Result — contract-invoice-strengthen — iter 001

- **verdict**: approved
- **iteration**: 001

## Findings Verification

### Finding #1 — [LOW] ValidationResult 型の重複定義

- **File**: `src/domain/services/contractValidation.ts`, `src/domain/services/invoiceValidation.ts`
- **Status**: REMAINS (intentionally deferred)
- **Evidence**: Both files still define `export type ValidationResult = { ok: true } | { ok: false; reason: string };` independently. This was explicitly marked Fix=**no** in `review-feedback-001.md` (Finding #1). No regression; fix was never scheduled.

### Finding #2 — [LOW] Integration テストの未実装

- **File**: `src/__tests__/domain/`
- **Status**: REMAINS (intentionally deferred)
- **Evidence**: `src/__tests__/usecases/` contains pre-existing integration tests (contracts, invoices usecase tests absent for this change), but TC-010〜TC-032 are not implemented. This was explicitly marked Fix=**no** in `review-feedback-001.md` (Finding #2) due to DB environment not being ready. No regression; fix was never scheduled.

### Finding #3 — [HIGH] contract.amount > 0 ガード欠落 (createInvoice)

- **File**: `src/application/usecases/createInvoice.ts`
- **Status**: FIXED ✓
- **Evidence**: `createInvoice.ts:40` — condition reads `if (contract.renewalType === "one_time" && contract.amount > 0)`. The `contract.amount > 0` guard is present. migrated zero-amount one_time contracts bypass the total check correctly.

### Finding #4 — [HIGH] contract.amount > 0 ガード欠落 (updateInvoice)

- **File**: `src/application/usecases/updateInvoice.ts`
- **Status**: FIXED ✓
- **Evidence**: `updateInvoice.ts:47` — condition reads `if (contract && contract.renewalType === "one_time" && contract.amount > 0)`. The `contract.amount > 0` guard is present. Same protection as Finding #3.

### Finding #5 — [MEDIUM] invoice フェッチがトランザクション外

- **File**: `src/application/usecases/updateInvoice.ts:22`
- **Status**: FIXED ✓
- **Evidence**: `updateInvoice.ts:39–54` — when `data.amount !== undefined`, `freshInvoice` is fetched inside the SERIALIZABLE transaction at L41 via `invoiceRepository.findById(data.invoiceId, data.organizationId, tx)`, and `freshInvoice.amount` (L54) is used in the total calculation (`existingTotal - freshInvoice.amount + data.amount`). The stale-amount mixing risk is resolved for the amount-update path.

### Finding #6 — [LOW] 監査ログが update 空振り時でも書き込まれる稀なケース

- **File**: `src/application/usecases/updateInvoice.ts:70`
- **Status**: REMAINS (accepted residual)
- **Evidence**: `updateInvoice.ts:63–87` — `invoiceRepository.update` result (`updatedInvoice`) is not null-checked before `auditLogRepository.create` (L76) inside the transaction. If a concurrent delete causes update to return null, the audit log is still committed. The null check at L90 is outside the transaction. This was explicitly acknowledged and accepted in `domain-invariants-result-002.md` (Finding #1, verdict approved) as a LOW, pre-existing-pattern issue occurring only in an extremely rare concurrent-delete timing window.

### Finding #7 — [LOW] 非 amount 更新パスで phantom 監査ログ (iter 001 Finding #3 残存)

- **File**: `src/application/usecases/updateInvoice.ts:63`
- **Status**: REMAINS (accepted residual)
- **Evidence**: Same root cause as Finding #6. When `data.amount` is undefined, there is no inner `findById` inside the transaction, so a concurrent invoice deletion between the outer fetch (L22) and the update (L63) causes `update` to return null with the audit log already committed in the same tx. This was explicitly identified as a residual from iter 001 in `domain-invariants-result-001.md` (Finding #3) and accepted as LOW in `domain-invariants-result-002.md` (verdict approved). `updateContract.ts` has the identical pre-existing pattern.

## Summary

| # | Severity | Status | Notes |
|---|----------|--------|-------|
| 1 | LOW | REMAINS (deferred) | Intentionally skipped in review-feedback-001 (Fix=no) |
| 2 | LOW | REMAINS (deferred) | Intentionally skipped in review-feedback-001 (Fix=no); DB not ready |
| 3 | HIGH | FIXED ✓ | `createInvoice.ts:40` guard confirmed present |
| 4 | HIGH | FIXED ✓ | `updateInvoice.ts:47` guard confirmed present |
| 5 | MEDIUM | FIXED ✓ | `freshInvoice` fetched inside SERIALIZABLE tx at L41 |
| 6 | LOW | REMAINS (accepted) | Acknowledged in domain-invariants-result-002 (approved) |
| 7 | LOW | REMAINS (accepted) | iter 001 Finding #3 residual; accepted in domain-invariants-result-002 |

All HIGH and MEDIUM findings are confirmed fixed and show no regression. The two remaining LOW residuals (#6, #7) were accepted by the domain-invariants reviewer with an **approved** verdict. No regressions detected. No contradictions (fixing A re-introducing B) detected.
