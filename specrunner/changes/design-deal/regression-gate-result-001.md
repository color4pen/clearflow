# Regression Gate Result — design-deal iteration 1

- **verdict**: needs-fix

## Findings Checked

### Finding 1 — [MEDIUM] won/lost フェーズで空の SectionCard が描画される
- **File**: src/app/(dashboard)/deals/[id]/page.tsx:161
- **Status**: ✅ FIXED
- **Evidence**: The condition now reads `{canChangePhase && deal.phase !== "won" && deal.phase !== "lost" && (` which correctly prevents the SectionCard from rendering in terminal phases.

### Finding 2 — [LOW] updateDealPhaseAction の結果未チェックでエラー時も router.refresh() を呼ぶ
- **File**: src/app/(dashboard)/deals/[id]/DealHeaderActions.tsx:27
- **Status**: ❌ REGRESSION
- **Evidence**: `handleTransition` still discards the return value of `updateDealPhaseAction` and calls `setIsSubmitting(false)` + `router.refresh()` unconditionally on lines 28-29. No `result.success` check exists; errors are silently swallowed and the UI is refreshed even on failure. The fix was not applied.

## Required Fix

In `DealHeaderActions.tsx`, capture the return value and guard `router.refresh()`:

```tsx
const result = await updateDealPhaseAction(dealId, formData);
setIsSubmitting(false);
if (!result.success) {
  alert(result.error ?? "フェーズの変更に失敗しました");
  return;
}
router.refresh();
```
