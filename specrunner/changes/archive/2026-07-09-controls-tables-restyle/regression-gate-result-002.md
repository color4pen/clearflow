# Regression Gate Result — Iteration 2

- **change**: controls-tables-restyle
- **iteration**: 2
- **date**: 2026-07-09
- **verdict**: approved

## Verification Summary

### Finding 1: TC-008 / TC-017 / TC-018 / TC-019 (must unit) が自動テストとして未実装

**Status: FIXED — no regression**

Tests implemented in `src/__tests__/static/uiBusinessStyle.test.ts`:

- `describe("DataTable styles — TC-008, TC-017, TC-018")` block contains:
  - TC-017: `expect(content).toContain("text-text-secondary")` → `DataTable.tsx` line 35 confirms `text-text-secondary` present ✅
  - TC-008: `expect(content).toContain("hover:bg-bg-surface-alt")` → `DataTable.tsx` line 49 confirms `hover:bg-bg-surface-alt` present ✅
  - TC-018: `expect(content).not.toContain("hover:bg-primary/10")` → `DataTable.tsx` contains no `hover:bg-primary/10` ✅

- `describe("BulkApprovalPanel result alert tokens — TC-019")` block contains:
  - Success: `bg-bg-success-light`, `text-success` → `BulkApprovalPanel.tsx` line 150 confirmed ✅
  - Failure: `bg-status-red-bg`, `text-status-red-text` → `BulkApprovalPanel.tsx` line 152 confirmed ✅
  - Partial: `bg-bg-row-pending`, `text-warning` → `BulkApprovalPanel.tsx` line 153 confirmed ✅
  - No raw palette: `bg-green-*` / `bg-red-*` / `bg-yellow-*` absent ✅

---

### Finding 2: TC-012（廃止定数の不在）が明示的な静的テストで担保されていない

**Status: FIXED — no regression**

Tests implemented in `src/__tests__/static/uiBusinessStyle.test.ts`:

- `describe("styles.ts deprecated constants — TC-012")` block contains 4 explicit `.not.toContain()` assertions:
  - `expect(content).not.toContain("BTN_PRIMARY_DISABLED")` ✅
  - `expect(content).not.toContain("BTN_SUCCESS")` ✅
  - `expect(content).not.toContain("BTN_WARNING")` ✅
  - `expect(content).not.toContain("BTN_SUBMIT")` ✅

- `styles.ts` grep for these constants returns zero matches — implementation confirms all four are absent ✅

---

## Findings

None. All ledger items remain fixed. No regressions detected.
