# Regression Gate Result — design-contract-invoice — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Verification Summary

5 findings were listed as fixed in the Findings Ledger. 1 is confirmed fixed; 4 are not fixed.

## Finding Status

### [VERIFIED FIXED] Finding 1 — findAllByContract の二重 DB クエリ

- **Original severity**: MEDIUM
- **Status**: fixed
- **Evidence**: `git diff main...HEAD` confirms that `InvoiceSection.tsx` previously received `organizationId` as a prop and called `invoiceRepository.findAllByContract` independently. In the current code, `page.tsx` calls `invoiceRepository.findAllByContract(id, organizationId)` once and passes the result as an `invoices: Invoice[]` prop to `InvoiceSection`. `InvoiceSection` contains no repository calls.

---

### [REGRESSION] Finding 2 — isExpiringWithin30Days のテスト関数コピー定義

- **Original severity**: LOW
- **Status**: not fixed
- **Severity**: high
- **Resolution**: fixable
- **File**: `src/__tests__/domain/contractHighlight.test.ts:8`, `src/app/(dashboard)/contracts/page.tsx:8`
- **Evidence**: `contracts/page.tsx` still declares `function isExpiringWithin30Days` without an `export` keyword. `contractHighlight.test.ts` (a new file added in this branch) contains a local copy of the identical function with the comment "contracts/page.tsx の isExpiringWithin30Days と同じロジック". No utility module (e.g. `src/lib/contractUtils.ts`) was created. A search for `isExpiringWithin30Days` across `src/` finds only the test file — not a shared import.
- **Fix**: Extract `isExpiringWithin30Days` to a utility module (e.g. `src/lib/contractUtils.ts`), export it, and import it in both `contracts/page.tsx` and `contractHighlight.test.ts`.

---

### [REGRESSION] Finding 3 — TC-013（定期契約でプログレスバー非表示）の自動テスト未実装

- **Original severity**: LOW
- **Status**: not fixed
- **Severity**: high
- **Resolution**: fixable
- **File**: `src/__tests__/domain/invoiceProgressBar.test.ts`
- **Evidence**: `invoiceProgressBar.test.ts` contains TC-012, TC-014, TC-015, and additional unnamed tests for edge cases, but no test with label TC-013 or any test that exercises the `renewalType === "recurring"` branch. `InvoiceSection.tsx` renders `<ProgressBarSummary>` only when `isOneTime` is true (`renewalType === "one_time"`), and the grid-cols-3 fallback for recurring contracts is untested by automated tests.
- **Fix**: Add a test in `invoiceProgressBar.test.ts` (or a new test file) that verifies the `renewalType === "recurring"` path — for example, asserting that `computeProgressBar` is not invoked, or testing the conditional logic (`isOneTime = renewalType === "one_time"` evaluates to `false` for `"recurring"`).

---

### [REGRESSION] Finding 4 — deals JOIN に organizationId の明示フィルタなし

- **Original severity**: LOW
- **Status**: not fixed
- **Severity**: high
- **Resolution**: fixable
- **File**: `src/infrastructure/repositories/contractRepository.ts:119`
- **Evidence**: `findAllByOrganization` performs `.innerJoin(deals, eq(contracts.dealId, deals.id))` without an explicit `eq(deals.organizationId, organizationId)` condition. The WHERE clause `eq(contracts.organizationId, organizationId)` filters contracts but does not add an explicit constraint on the `deals` table. The defensive filter was not added.
- **Fix**: Add `eq(deals.organizationId, organizationId)` to the WHERE clause (or innerJoin ON condition) of `findAllByOrganization`.

---

### [REGRESSION] Finding 5 — existsPendingByTriggerEntityId の例外がページ全体に伝播する

- **Original severity**: LOW
- **Status**: not fixed
- **Severity**: high
- **Resolution**: fixable
- **File**: `src/app/(dashboard)/contracts/[id]/page.tsx:31`
- **Evidence**: `const hasPendingApproval = await requestRepository.existsPendingByTriggerEntityId(organizationId, id);` is called without a try-catch block. A DB error causes the entire page to return a 500 error. `design.md` D6 specifies "取得失敗時はバナー非表示で degradation" but the implementation does not implement this fallback.
- **Fix**: Wrap the call in try-catch and set `hasPendingApproval = false` on any exception so that the page degrades gracefully:
  ```ts
  let hasPendingApproval = false;
  try {
    hasPendingApproval = await requestRepository.existsPendingByTriggerEntityId(organizationId, id);
  } catch {
    // degradation: approval banner is optional; do not fail the page
  }
  ```
