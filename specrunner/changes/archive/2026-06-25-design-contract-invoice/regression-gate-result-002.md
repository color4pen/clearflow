# Regression Gate Result — Iteration 002

- **date**: 2026-06-25
- **branch**: change/design-contract-invoice-a1057692
- **verdict**: approved

## Summary

All 5 findings from the Iteration 1 review have been verified as fixed. No regressions or contradictions detected.

## Finding Verification

### [MEDIUM] findAllByContract の二重 DB クエリ
- **File**: src/app/(dashboard)/contracts/[id]/page.tsx:30 / src/app/(dashboard)/contracts/[id]/InvoiceSection.tsx
- **Status**: ✅ Fixed
- **Evidence**: `page.tsx` fetches `invoices` once via `invoiceRepository.findAllByContract(id, organizationId)` and passes the result as a prop to `InvoiceSection`. `InvoiceSection` no longer imports or calls `invoiceRepository` — the import was removed entirely. Single DB query per page load.

### [LOW] isExpiringWithin30Days のテスト関数コピー定義
- **File**: src/__tests__/domain/contractHighlight.test.ts
- **Status**: ✅ Fixed
- **Evidence**: The test file now imports `isExpiringWithin30Days` from `@/domain/services/contractHighlight` (line 2) and does not redefine the function. The production implementation is tested directly.

### [LOW] TC-013（定期契約でプログレスバー非表示）の自動テスト未実装
- **File**: src/__tests__/domain/invoiceProgressBar.test.ts
- **Status**: ✅ Fixed
- **Evidence**: A TC-013 test case is now present: `"TC-013: 定期契約（recurring）ではプログレスバーを表示しない"`. It asserts that `renewalType === "recurring"` yields `isOneTime === false`, covering the `InvoiceSection` branching condition `isOneTime ? <ProgressBarSummary> : <grid-cols-3>`.

### [LOW] deals JOIN に organizationId の明示フィルタなし
- **File**: src/infrastructure/repositories/contractRepository.ts:119
- **Status**: ✅ Fixed
- **Evidence**: The `deals` INNER JOIN now includes an explicit `eq(deals.organizationId, organizationId)` condition in the join clause: `.innerJoin(deals, and(eq(contracts.dealId, deals.id), eq(deals.organizationId, organizationId)))`. Cross-tenant isolation is now explicit at the `deals` table level.

### [LOW] existsPendingByTriggerEntityId の例外がページ全体に伝播する
- **File**: src/app/(dashboard)/contracts/[id]/page.tsx:31
- **Status**: ✅ Fixed
- **Evidence**: The call is wrapped in try-catch with `hasPendingApproval` initialized to `false`. On DB error the banner is suppressed and the page remains available, matching the design.md D6 degradation requirement. Comment in catch block explicitly states: `// DB エラー時はバナー非表示で degradation`.

## Findings (new)

None.
