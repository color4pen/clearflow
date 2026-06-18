# Regression Gate Result — Iteration 1

- **change**: approval-delegation
- **iteration**: 1
- **verdict**: needs-fix
- **date**: 2026-06-18

---

## Summary

7 findings were reviewed. 5 are confirmed fixed. 2 regressions remain.

---

## Verified Fixed

### [MEDIUM] UI uses raw UUID text inputs instead of user selection
- **File**: `src/app/(dashboard)/settings/delegations/page.tsx`
- **Status**: ✅ Fixed
- **Evidence**: `fromUserId` and `toUserId` fields are rendered as `<select>` elements populated via `listOrganizationUsers`. UUID text inputs are gone.

### [LOW] create() and update() use bare db instead of queryRunner for secondary role lookup
- **File**: `src/infrastructure/repositories/approvalDelegationRepository.ts`
- **Status**: ✅ Fixed
- **Evidence**: Both `create()` (line 134) and `update()` (line 167) now use `queryRunner` (which honours the `tx?` argument) for the secondary `SELECT role FROM users` lookup.

### [MEDIUM] 委譲作成と監査ログ記録がトランザクション外
- **File**: `src/application/usecases/createDelegation.ts`
- **Status**: ✅ Fixed
- **Evidence**: `approvalDelegationRepository.create()` and `auditLogRepository.create()` are both executed inside `db.transaction(async (tx) => { ... })` (lines 73–103). The `tx` is threaded to both calls.

### [MEDIUM] 委譲無効化と監査ログ記録がトランザクション外
- **File**: `src/application/usecases/deactivateDelegation.ts`
- **Status**: ✅ Fixed
- **Evidence**: `approvalDelegationRepository.update()` and `auditLogRepository.create()` are both executed inside `db.transaction(async (tx) => { ... })` (lines 19–47). The `tx` is threaded to both calls. `update()` now accepts a `tx?` argument.

---

## Regressions

### [LOW] canApprove imported but never used — ESLint warning (Findings 1 and 7)
- **Files**: `src/application/usecases/approveRequest.ts:11`
- **Severity**: low
- **Resolution**: fixable
- **Status**: ❌ Regression
- **Evidence**: Line 11 still has `canApprove,` in the import:
  ```ts
  import {
    getCurrentStep,
    isAllApproved,
    canApprove,          // ← imported but never called
    canApproveWithDelegation,
    isStepExpired,
  } from "@/domain/services/approvalStepService";
  ```
  Only `canApproveWithDelegation` is called in the function body (lines 114, 153). `canApprove` is unused and will produce an ESLint `no-unused-vars` warning. Remove `canApprove` from the import list.

  Note: Findings 1 and 7 describe the same defect. They are counted as one regression here.

### [LOW] TC-003 'Inactive delegation is ignored' has no domain-level unit test
- **File**: `src/__tests__/domain/approvalStepService.test.ts`
- **Severity**: low
- **Resolution**: fixable
- **Status**: ❌ Regression
- **Evidence**: The `describe("approvalStepService — canApproveWithDelegation", ...)` block contains 6 test cases. None of them passes a delegation with `isActive: false` to `canApproveWithDelegation`. `canApproveWithDelegation` itself does not filter by `isActive` (by design — callers must pre-filter), so if an inactive delegation were passed it would be accepted. TC-003 (must) requires a unit test asserting this boundary. Either:
  1. Add a test: `it("accepts delegation regardless of isActive (caller must pre-filter)", ...)` that documents the contract and asserts the expected behavior; or
  2. Add an explicit defensive guard (`d.isActive === true`) inside the `.filter()` in `canApproveWithDelegation` and a test that it rejects inactive delegations.

---

## Fixes Required

| # | File | Action |
|---|------|--------|
| 1 | `src/application/usecases/approveRequest.ts` | Remove `canApprove` from the named import on line 11 |
| 2 | `src/__tests__/domain/approvalStepService.test.ts` | Add a unit test covering TC-003 (inactive delegation boundary) |
