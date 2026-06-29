# Regression Gate Result — interaction-contract-invoice — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Ledger Verification

3 findings were declared fixed by the code-fixer step. Results below.

---

### Finding 1 — `details` フィールドが usecase で無視される [MEDIUM]

- **Status**: ✅ CONFIRMED FIXED
- **File**: `src/application/usecases/createContractAdjustment.ts`, `src/application/usecases/createInvoiceAdjustment.ts`

Both usecases now properly convert the `details?: string | null` parameter into the JSONB structure expected by `interactionRepository.create`:

```typescript
details: data.details != null
  ? { notes: data.details, challenge: null, budget: null, decisionMaker: null, timeline: null, competitors: null }
  : null,
```

Additionally, `contractAdjustment.dynamic.test.ts` and `invoiceAdjustment.dynamic.test.ts` were extended with tests that assert `details` round-trips correctly through the usecase.

---

### Finding 2 — TC-020・TC-021・TC-023 Server Action 動的テストが欠落 [LOW → HIGH]

- **Status**: ❌ NOT FIXED (regression confirmed)
- **File**: `src/app/actions/interactions.ts`

`src/__tests__/actions/interactions.dynamic.test.ts` does not exist. A search of `src/__tests__/actions/` confirms only the pre-existing test files are present; no interaction action test file was added in this branch:

```
accountActions.test.ts
approvalRoleCheck.test.ts
platformActions.test.ts
requestValidation.test.ts
roleCheck.test.ts
```

The added `interactionAuthorization.dynamic.test.ts` tests only `canPerform()` in isolation, not the Server Action's full behavior:
- TC-020: 未認証ユーザーが早期 return することの固定なし
- TC-021: 認可不足時の早期 return 固定なし
- TC-023: 成功時の `createContractAdjustment` / `createInvoiceAdjustment` 呼出し＋`revalidatePath` 実行の固定なし

The `mock.module` style test for the Server Action as a whole (auth → authz → usecase → revalidatePath) is absent despite being classified as `must` priority in `test-cases.md`.

---

### Finding 3 — `i.contractId` / `i.invoiceId` の null チェックなし [LOW → HIGH]

- **Status**: ❌ NOT FIXED (regression confirmed)
- **File**: `src/application/usecases/getDealActivity.ts:119`

`contractInteractions.map` still interpolates `i.contractId` (type: `string | null`) directly into the href template with no null fallback or assertion:

```typescript
// Line 119 — i.contractId is string | null, no null guard
href: `/contracts/${i.contractId}`,
```

For `invoiceInteractions.map`, the approach changed to use a `relatedInvoice` lookup which provides an implicit guard, but `i.invoiceId` is still used in the template literal without explicit assertion:

```typescript
href: relatedInvoice
  ? `/contracts/${relatedInvoice.contractId}/invoices/${i.invoiceId}`  // i.invoiceId: string | null
  : `/contracts`,
```

Neither `?? ""` fallback nor a non-null assertion comment was added as recommended in the review feedback.

---

## Summary

| Finding | Severity (original) | Status | Action Required |
|---------|---------------------|--------|-----------------|
| 1 — `details` ignored in usecase | medium | ✅ Fixed | none |
| 2 — TC-020/021/023 Server Action tests missing | low | ❌ Not fixed | Add `src/__tests__/actions/interactions.dynamic.test.ts` with `mock.module` style tests |
| 3 — `i.contractId` null interpolation in getDealActivity | low | ❌ Not fixed | Add `?? ""` fallback or non-null assertion to `contractInteractions.map` href; consider same for `invoiceInteractions.map` |
