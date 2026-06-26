# Regression Gate Result — action-items-ui / Iteration 1

- **verdict**: needs-fix

## Ledger Verification

### Finding 1 — [MEDIUM] DashboardActionItem.action_item に id フィールドがなく React key が衝突しうる

- **File**: src/domain/models/dashboard.ts
- **Status**: ✅ Fixed
- **Evidence**:
  - `id: string` is present at line 13 of `dashboard.ts`
  - `SalesDashboard.tsx` uses `action-${item.id}` as the React key (line 192)

---

### Finding 2 — [LOW] handleToggle が index ベースのルックアップを残している

- **File**: src/app/(dashboard)/deals/[id]/meetings/[meetingId]/MeetingActionItemsSection.tsx:26
- **Status**: ❌ Regression (not fixed)
- **Evidence**:
  - Line 26: `function handleToggle(idx: number)` — parameter is still `number`, not `string`
  - Line 28: `const item = actionItems[idx];` — still performs index-based lookup
  - Line 105: `onChange={() => handleToggle(idx)}` — call site still passes `idx` (index), not `item.id`
  - The rename from `index` to `idx` was applied, but the required signature change to `handleToggle(id: string)` and call-site update to `handleToggle(item.id)` were not.
- **Severity**: low
- **Resolution**: fixable

---

### Finding 3 — [LOW] updateActionItem の監査ログに変更フィールドの metadata が含まれていない

- **File**: src/application/usecases/updateActionItem.ts:93
- **Status**: ❌ Regression (not fixed)
- **Evidence**:
  - `auditLogRepository.create` at lines 93–102 has no `metadata` field
  - `auditLogRepository` accepts `metadata?: Record<string, unknown> | null` (confirmed in repository source)
  - `toggleActionItemDone` correctly passes `metadata: { done: !existing.done }`, but `updateActionItem` passes no metadata, leaving changed fields unrecorded in audit logs
- **Severity**: low
- **Resolution**: fixable

## Required Fixes

1. **MeetingActionItemsSection.tsx** — Change `handleToggle` signature to `handleToggle(id: string)`, remove the `actionItems[idx]` lookup, and update the call site to `onChange={() => handleToggle(item.id)}`.

2. **updateActionItem.ts** — Add `metadata: updateData` (or an equivalent snapshot of changed fields) to the `auditLogRepository.create` call inside the transaction.
