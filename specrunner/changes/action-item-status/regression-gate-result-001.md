# Regression Gate Result — action-item-status iteration 001

- **verdict**: approved
- **date**: 2026-06-29
- **branch**: feat/action-item-status-adaf8068
- **iteration**: 1

## Summary

All 7 findings from the ledger are confirmed fixed. No regressions detected.

---

## Finding Verification

### [HIGH] Finding 1 & 4: TC-008/TC-009 — toggleActionItemDone の status 同期テスト

- **File**: `src/__tests__/usecases/toggleActionItemDone.dynamic.test.ts`
- **Status**: ✅ FIXED

`toggleActionItemDone.dynamic.test.ts` now contains:

1. `"done=false → true のとき status が 'done' に同期される"` (TC-008)
   - Asserts `state.updateArgs?.done === true` and `state.updateArgs?.status === "done"`
2. `"done=true → false のとき status が 'todo' に同期される"` (TC-009)
   - Asserts `state.updateArgs?.done === false` and `state.updateArgs?.status === "todo"`
3. `"監査は action_item.toggle / metadata.done のまま"` (TC-024)
   - Backward-compatibility of audit action confirmed

Implementation in `toggleActionItemDone.ts` line 26:
```ts
{ done: !existing.done, status: !existing.done ? "done" : "todo" }
```
This synchronizes `status` on every toggle, matching TC-008/TC-009 requirements.

---

### [HIGH] Finding 2 & 5: TC-001〜003 — derivation テストが mapRow を実行せず空洞

- **File**: `src/__tests__/usecases/actionItemStatusDerivation.dynamic.test.ts`
- **Status**: ✅ FIXED

The test no longer mocks `actionItemRepository`. Instead it imports `mapRow` directly as a named export:

```ts
import { mapRow } from "@/infrastructure/repositories/actionItemRepository";
```

Raw DB rows are constructed with `rawRow({ status: null, done: false })` and passed to `mapRow()` directly, exercising the actual derivation logic:

```ts
(row.status as ActionItemStatus | null) ?? (row.done ? "done" : "todo")
```

Four cases are tested: `status=null+done=false → "todo"`, `status=null+done=true → "done"`, `status="in_progress"` explicit, `status="done"` explicit. `mapRow` is confirmed as `export function mapRow(...)` in `actionItemRepository.ts` line 7.

---

### [MEDIUM] Finding 3, 6 & 7: TC-011 — done=false フィルタ後方互換テスト

- **Files**: `src/__tests__/usecases/listActionItemsDoneFilter.dynamic.test.ts`
- **Status**: ✅ FIXED

Finding 6 referenced a filename `actionItemFilterBackcompat.dynamic.test.ts` which does not exist, but the behavior it required is fully covered in `listActionItemsDoneFilter.dynamic.test.ts`:

1. `"done=false を findByOrganization のフィルタに渡し、返った行を返す"` — confirms filter propagation (TC-011 partial)
2. `"done=true の行は done=false フィルタ適用後の結果に含まれない"` — confirms exclusion behavior (TC-011 exclusion, and addresses Finding 7)

The mock simulates SQL-level filtering:
```ts
if (typeof filters?.done === "boolean") {
  rows = rows.filter((r) => r.done === filters.done);
}
```

With `state.rows = [todoItem, doneItem]` and `done: false` filter, the result has length 1 containing only `item-001` with `done=false`. The exclusion assertion is confirmed.

---

## Conclusion

| Finding | Severity | Status |
|---------|----------|--------|
| TC-008/TC-009 toggleActionItemDone status sync (1st report) | HIGH | ✅ Fixed |
| derivation test bypasses mapRow (1st report) | HIGH | ✅ Fixed |
| TC-011 done=false filter backcompat missing (1st report) | MEDIUM | ✅ Fixed |
| TC-008/TC-009 toggleActionItemDone status sync (escalated) | HIGH | ✅ Fixed |
| TC-001〜003 derivation test hollow (escalated) | HIGH | ✅ Fixed |
| TC-011 backcompat test missing (escalated) | MEDIUM | ✅ Fixed |
| TC-011 exclusion behavior not asserted | MEDIUM | ✅ Fixed |

No regressions. No contradictions. Approved for merge.
