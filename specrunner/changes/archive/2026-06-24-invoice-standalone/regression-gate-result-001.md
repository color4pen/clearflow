# Regression Gate Result: invoice-standalone — Iteration 1

- **verdict**: approved

## Summary

All 10 findings from the ledger are confirmed fixed. No regressions detected.

## Finding Verification

### [HIGH] integration テスト 11件未実装（TC-004〜TC-009, TC-011, TC-022, TC-023, TC-027, TC-034）
- **File**: `src/__tests__/usecases/invoiceManagement.test.ts`
- **Status**: ✅ FIXED
- **Evidence**: The file now contains full test coverage for all 11 previously missing cases: TC-004/TC-005/TC-006 (updateInvoiceStatus — paidAt parameter, fallback, domain event), TC-007/TC-008/TC-009 (getInvoice — return shape, null on missing, organizationId filter), TC-011 (contractId mismatch → notFound), TC-022 (paidAt JST-based refine), TC-023 (createInvoice repository + audit + transaction), TC-027 (one_time contract overflow check), TC-034 (revalidatePath both paths).

### [HIGH] paidAt バリデーションが UTC 基準で JST 深夜帯に入金確認操作が失敗する（×2 findings）
- **File**: `src/app/actions/invoices.ts:30`
- **Status**: ✅ FIXED
- **Evidence**: Line 30 now uses `new Intl.DateTimeFormat('sv', { timeZone: 'Asia/Tokyo' }).format(new Date())` instead of `new Date().toISOString().slice(0, 10)`. The refine validation is JST-based.

### [HIGH] todayString() が UTC 基準で JST 深夜帯に入金確認 UI が誤動作する
- **File**: `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/InvoiceActions.tsx:15`
- **Status**: ✅ FIXED
- **Evidence**: `todayString()` now returns `new Intl.DateTimeFormat('sv', { timeZone: 'Asia/Tokyo' }).format(new Date())`. Both `max={todayString()}` and the dialog default value are JST-based.

### [MEDIUM] test-cases.md の automated integration テスト 11 件が未実装（×2 findings）
- **File**: `src/__tests__/usecases/invoiceManagement.test.ts`
- **Status**: ✅ FIXED — same evidence as the HIGH-severity test finding above.

### [LOW] JSDoc コメントに「終端状態（paid / overdue）」が残存（×3 findings）
- **File**: `src/domain/services/invoiceTransition.ts:13`
- **Status**: ✅ FIXED
- **Evidence**: JSDoc now reads `終端状態（paid）からの遷移、および定義外の遷移は不可。` — `overdue` has been removed from the terminal-state description, consistent with the `overdue: ["paid"]` transition entry in the table.

### [LOW] 請求登録ページに canPerform 権限チェックがない（×2 findings）
- **File**: `src/app/(dashboard)/contracts/[id]/invoices/new/page.tsx`
- **Status**: ✅ FIXED
- **Evidence**: Line 18 now contains `if (!canPerform(session!.user.role, "invoice", "create")) { notFound(); }` before rendering the form.

## Regressions

None.

## Contradictions

None.
