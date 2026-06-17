# Regression Gate Result — webhook-retry-audit-export — iter 1

- **verdict**: approved

## Summary

5 findings in the ledger were inspected against the current branch (`feat/webhook-retry-audit-export-f2f813bd`).

- **Finding 4** (MEDIUM / findById org filter) was explicitly fixed by the code-fixer and the fix is confirmed present.
- **Findings 1, 2, 3** (all LOW / from code review) were explicitly marked **Fix: no** by the code reviewer and were intentionally left as-is. They are accepted risks, not regressions.
- **Finding 5** (LOW / TOCTOU) was reviewed by the domain-invariants reviewer, accepted as-is due to low severity and single-instance deployment context. No code change was required; not a regression.

No regressions detected.

---

## Finding-by-finding Verification

### Finding 1 — [LOW] TC-006: deliverSingleAttempt の単発性をアサートするテストが欠けている

- **File**: `src/__tests__/usecases/webhookRetryAuditExport.test.ts`
- **Expected fix**: `deliverSingleAttempt` 定義以降のソース断片を切り出し、`expect(snippet).not.toContain("for ")` と `expect(snippet).not.toContain("Bun.sleep")` を追加する
- **Review decision**: `Fix: no` (review-feedback-001.md #1)
- **Current state**: Test file contains assertions for export and callsite only. No `not.toContain` assertions for the function body. Consistent with Fix: no decision.
- **Status**: ✅ Accepted won't-fix — no regression

### Finding 2 — [LOW] CSV 行区切りが RFC 4180 規定の CRLF ではなく LF

- **File**: `src/app/api/audit-logs/export/route.ts:75`
- **Expected fix**: `[header, ...rows].join("\r\n")` に変更する
- **Review decision**: `Fix: no` (review-feedback-001.md #3)
- **Current state**: Line 75 still reads `const csvContent = BOM + [header, ...rows].join("\n");` — LF separator is in place.
- **Status**: ✅ Accepted won't-fix — no regression

### Finding 3 — [LOW] ページが auditLogRepository を直接呼び出し（Server Action パターンと不整合）

- **File**: `src/app/(dashboard)/settings/audit-logs/page.tsx:52`
- **Expected fix**: 読み取り専用 Server Action（`listAuditLogsAction`）を追加する
- **Review decision**: `Fix: no` (review-feedback-001.md #4); tasks.md で直接呼び出しが明示された意図的選択
- **Current state**: Line 52 still reads `const logs = await auditLogRepository.findByOrganization(session.user.organizationId, { ... });` — direct repository call is in place.
- **Status**: ✅ Accepted won't-fix — no regression

### Finding 4 — [MEDIUM] findById に organizationId フィルタなし — 間接テナント分離パターン

- **File**: `src/infrastructure/repositories/webhookDeliveryRepository.ts:62`
- **Expected fix**: `findById(id: string, organizationId: string)` にシグネチャを変更し、`webhookEndpoints` JOIN 経由で org 条件を付与する
- **Source**: domain-invariants-result-001.md #1 (MEDIUM)
- **Current state**: `findById` function signature is `findById(id: string, organizationId: string)` and the implementation performs an `innerJoin` with `webhookEndpoints` filtering on `eq(webhookEndpoints.organizationId, organizationId)`. Fix is fully applied.

```typescript
// webhookDeliveryRepository.ts:62-79
export async function findById(
  id: string,
  organizationId: string
): Promise<WebhookDelivery | null> {
  const result = await db
    .select({ delivery: webhookDeliveries })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      and(
        eq(webhookDeliveries.endpointId, webhookEndpoints.id),
        eq(webhookEndpoints.organizationId, organizationId)
      )
    )
    .where(eq(webhookDeliveries.id, id))
    .limit(1);
  return result[0] ? mapRow(result[0].delivery) : null;
}
```

- **Status**: ✅ Fix confirmed present — no regression

### Finding 5 — [LOW] deliverSingleAttempt の attempts カウンタに TOCTOU 競合の可能性

- **File**: `src/infrastructure/webhookDelivery.ts:111`
- **Expected fix**: `UPDATE ... SET attempts = attempts + 1` のアトミックインクリメントか、`resetForRetry` を内部化する
- **Source**: domain-invariants-result-001.md #2 (LOW)
- **Current state**: `deliverSingleAttempt` still reads `currentAttempts` via `findById` then writes `currentAttempts + 1` in a separate `updateStatus` call — TOCTOU pattern is present. However, the domain-invariants reviewer explicitly accepted this as LOW severity with impact limited to display precision (trial count under-recording on concurrent admin retries), with no functional breakage. No code change was required.

  Note: the `findById` call now correctly passes `endpoint.organizationId`, so the security dimension of this call (tenant isolation) is properly enforced.

- **Status**: ✅ Accepted as-is (LOW severity, single-instance deployment, admin-only operation) — no regression
