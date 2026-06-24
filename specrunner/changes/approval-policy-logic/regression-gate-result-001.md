# Regression Gate Result — approval-policy-logic / Iteration 1

- **verdict**: needs-fix
- **date**: 2026-06-24
- **branch**: feat/approval-policy-logic-71491834

---

## Summary

10 findings verified. 6 confirmed fixed (including the 1 HIGH and 3 MEDIUM), 4 LOW findings remain unresolved.

---

## Finding Verification

### F-01 [MEDIUM] 非 null アサーションが DB 不変条件に依存 — evaluatePolicies.ts:27
- **Status**: ✅ FIXED
- **Evidence**: `evaluatePolicies.ts` lines 28–33 add an explicit runtime guard: if `conditionOperator === null || conditionValue === null`, logs a `console.error` and returns `false`. The non-null assertion (`!`) is no longer used.

### F-02 [MEDIUM] 統合テストが静的コード解析のみ
- **Status**: ✅ FIXED
- **Evidence**: `approvalPolicyFlow.test.ts` lines 309–365 add a "ランタイム動作検証" describe block using `mock.module` to mock `approvalPolicyRepository`. TC-023 through TC-028 verify actual filter behavior (empty policy list, unconditional match, conditional match/non-match, null-guard skip, multi-policy) at runtime.

### F-03 [LOW] Risks セクションに旧 DESC（降順）表記が残存
- **Status**: ❌ NOT FIXED (REGRESSION)
- **File**: `specrunner/changes/approval-policy-logic/design.md:89`
- **Evidence**: Line 89 still reads `ポリシーの作成順（\`createdAt\` 降順）で先頭を採用`. The implementation at `approvalPolicyRepository.ts:119` uses `asc(approvalPolicies.createdAt)`. The contradiction between design document and implementation is unchanged.
- **Resolution**: fixable

### F-04 [LOW] TC-033（skipPolicyCheck 無限ループ防止）が動的テストでカバーされていない
- **Status**: ❌ NOT FIXED (REGRESSION)
- **File**: `src/__tests__/usecases/approvalPolicyFlow.test.ts`
- **Evidence**: The test at line 204–207 still uses static source-string analysis (`expect(src).toContain("skipPolicyCheck: true")`). No spy-based dynamic test for `handleApprovalCompleted` was added. A spy on `updateInquiryStatus` verifying it receives `{ skipPolicyCheck: true }` would catch future regressions without DB infrastructure.
- **Resolution**: fixable

### F-05 [HIGH] 監査ログ metadata に templateId が欠落
- **Status**: ✅ FIXED
- **Evidence**: `updateInquiryStatus.ts:126`: `metadata: { originType: "system", policyId: policy.id, templateId: template.id }`. `templateId` is now present, enabling `existsPendingByTemplateId` to detect these system-generated requests.

### F-06 [MEDIUM] ポリシーゲート発動時に引合側の監査ログが記録されない
- **Status**: ✅ FIXED
- **Evidence**: `updateInquiryStatus.ts` lines 132–146 add a second `auditLogRepository.create` call with `action: "inquiry.conversionPending"`, `targetType: "inquiry"`, and `metadata: { fromStatus, pendingApprovalRequestId, policyId }`.

### F-07 [LOW] テンプレート不在フォールバック時に警告ログが出力されない（その1）
- **Status**: ❌ NOT FIXED (REGRESSION)
- **File**: `src/application/usecases/updateInquiryStatus.ts` (around original line 159, currently around line 175–177)
- **Evidence**: When `approvalTemplateRepository.findById` returns `null`, the code silently falls through to the conventional deal-creation flow with only a comment: `// テンプレートが見つからない場合は従来フローにフォールバック（fall through）`. No `console.warn` is emitted. Policy ID that has a missing template cannot be diagnosed from logs.
- **Resolution**: fixable

### F-08 [LOW] TOCTOU 競合条件 — 重複チェックとリクエスト作成が同一トランザクション外
- **Status**: ✅ ACCEPTED / MITIGATED
- **Evidence**: `updateInquiryStatus.ts` lines 50–57 implement `findByOriginTriggerEntity` duplicate check (the best feasible mitigation without DB schema changes). The known residual TOCTOU risk is explicitly accepted in spec-review-result-003 and design.md D4 / Trade-offs. Root fix requires a DB-level partial unique constraint and is out of scope.

### F-09 [LOW] テンプレート不在フォールバック時に警告ログがない（iter-1 残存）
- **Status**: ❌ NOT FIXED (REGRESSION)
- **File**: `src/application/usecases/updateInquiryStatus.ts` (around original line 176)
- **Evidence**: Same location as F-07. Only a code comment exists; no `console.warn` with policy ID is emitted. Orphaned-policy diagnosis is still not possible at runtime. (Duplicate of F-07 scope — one fix covers both.)
- **Resolution**: fixable

### F-10 [LOW] 重複チェックとリクエスト作成の間の TOCTOU 競合条件が残存（iter-1 残存）
- **Status**: ✅ ACCEPTED / MITIGATED
- **Evidence**: Same as F-08. Duplicate check present; risk is accepted.

---

## Remaining Issues (needs-fix)

| # | Severity | File | Issue |
|---|----------|------|-------|
| F-03 | LOW | design.md:89 | Risks セクションが「降順」と記載しているが実装は昇順 |
| F-04 | LOW | approvalPolicyFlow.test.ts | TC-033 skipPolicyCheck のテストが静的解析のみ |
| F-07/F-09 | LOW | updateInquiryStatus.ts ~line 175 | テンプレート不在時に console.warn がなくサイレントフォールバック |

### Required Fixes

1. **design.md:89** — `createdAt 降順` → `createdAt 昇順` に修正。
2. **approvalPolicyFlow.test.ts** — `handleApprovalCompleted` にスパイを挟み、`skipPolicyCheck: true` が渡ることを動的に検証するテストを追加。
3. **updateInquiryStatus.ts** — `if (template)` ブロックの外側（`template` が `null` の場合）に以下を追加:
   ```typescript
   console.warn(
     `[updateInquiryStatus] Template not found for policy ${policy.id} (templateId: ${policy.templateId}) — falling back to direct deal creation`
   );
   ```
