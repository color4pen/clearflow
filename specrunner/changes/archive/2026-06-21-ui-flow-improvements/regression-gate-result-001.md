# Regression Gate Result — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Verification Summary

All 3 ledger findings were checked against the current branch (`change/ui-flow-improvements-511b0ffc`).
None of the 3 claimed fixes is present in the code. Details below.

---

## Finding Verification

### Ledger Finding 1 — [LOW] removeDealContact UC がトランザクション外で監査ログを記録する

- **File**: `src/application/usecases/removeDealContact.ts`
- **Status**: NOT FIXED — regression
- **Severity**: medium
- **Resolution**: fixable

**Evidence**: `removeDealContact.ts` lines 14–26 execute `deleteByDealAndContact` and `auditLogRepository.create` as two independent `await` calls with no `db.transaction()` wrapper. If `auditLogRepository.create` throws after deletion succeeds, the deletion is committed to the DB but has no audit trail.

```
// current code (no transaction)
await dealContactRepository.deleteByDealAndContact(...)   // line 14
await auditLogRepository.create({...})                    // line 20
```

`addDealContact.ts` (same PR) wraps both operations in `db.transaction()` — the asymmetry noted in the original finding is still present. The code-review feedback (`review-feedback-001.md` Finding #1) acknowledged this issue but marked `Fix: no`. The ledger states this finding "was fixed", which contradicts the current code.

**Fix**: wrap both calls in `db.transaction(async (tx) => { ... })` using the `tx?` parameter already supported by `deleteByDealAndContact` and `auditLogRepository.create`.

---

### Ledger Finding 2 — [MEDIUM] 削除と監査ログが非トランザクション — 監査ログの完全性が保証されない

- **File**: `src/application/usecases/removeDealContact.ts:14`
- **Status**: NOT FIXED — regression (duplicate root cause as Finding 1)
- **Severity**: medium
- **Resolution**: fixable

**Evidence**: Same code location as Finding 1. The two database operations remain outside any transaction boundary. This is the same root cause described at higher severity by a different reviewer pass. Neither the LOW nor the MEDIUM framing of this issue has a fix present in the branch.

**Fix**: identical to Finding 1 above.

---

### Ledger Finding 3 — [MEDIUM] contactId のテナント帰属を検証していない — クロステナント deal_contacts レコードが作成可能

- **File**: `src/application/usecases/addDealContact.ts:9` / `src/infrastructure/repositories/dealContactRepository.ts`
- **Status**: NOT FIXED — regression
- **Severity**: medium
- **Resolution**: fixable

**Evidence**: `dealContactRepository.create` (lines 32–41) validates that `dealId` belongs to `organizationId`:

```typescript
// dealContactRepository.ts lines 33–41
const owningDeal = await queryRunner
  .select({ id: deals.id })
  .from(deals)
  .where(and(eq(deals.id, data.dealId), eq(deals.organizationId, data.organizationId)))
  .limit(1);
```

However, `contactId` (a `clientContacts.id`) is inserted without any verification that the referenced `clientContacts` row belongs to a `clients` record with the same `organizationId`. A direct HTTP POST to `addDealContactAction` with a `contactId` from a different tenant is accepted.

The UI filtering (`clientContacts` is fetched from the same `inquiry.clientId`) prevents the issue in the normal browser flow, but does not protect against direct API requests. The `review-feedback-001.md` notes the call-site safety but does not add a defense-in-depth check inside the repository.

**Fix**: add a tenant check on `contactId` inside `dealContactRepository.create`, e.g.:

```typescript
const owningContact = await queryRunner
  .select({ id: clientContacts.id })
  .from(clientContacts)
  .innerJoin(clients, eq(clientContacts.clientId, clients.id))
  .where(
    and(
      eq(clientContacts.id, data.contactId),
      eq(clients.organizationId, data.organizationId)
    )
  )
  .limit(1);

if (owningContact.length === 0) {
  throw new Error("指定された担当者が見つからないか、アクセス権限がありません");
}
```

---

## Verdict

All 3 ledger findings are unresolved in the current code. Findings 2 and 3 are MEDIUM severity and remain exploitable. No contradiction between findings was detected (fixing the transaction and the contactId check are independent changes).

- **verdict**: needs-fix
