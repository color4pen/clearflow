# Regression Gate Result — approval-policy-logic / Iteration 2

- **verdict**: approved
- **date**: 2026-06-24
- **branch**: feat/approval-policy-logic-71491834

---

## Summary

10 findings verified. All 10 are confirmed fixed (or accepted/mitigated for TOCTOU). No regressions detected.

---

## Finding Verification

### F-01 [MEDIUM] 非 null アサーションが DB 不変条件に依存 — evaluatePolicies.ts:27
- **Status**: ✅ FIXED
- **Evidence**: `evaluatePolicies.ts` lines 28–33 retain the explicit runtime guard: `if (policy.conditionOperator === null || policy.conditionValue === null)` logs a `console.error` and returns `false`. No non-null assertion (`!`) is used.

### F-02 [MEDIUM] 統合テストが静的コード解析のみ
- **Status**: ✅ FIXED
- **Evidence**: `approvalPolicyFlow.test.ts` lines 334–390 contain a "evaluatePolicies — ランタイム動作検証" describe block using `mock.module` to inject a fake `approvalPolicyRepository`. TC-023 through TC-028 verify actual runtime filter behavior: empty-list → empty result, unconditional match, conditional match, conditional non-match, null-guard skip, multi-policy filtering.

### F-03 [LOW] Risks セクションに旧 DESC（降順）表記が残存
- **Status**: ✅ FIXED
- **Evidence**: `design.md` line 89 now reads: `ポリシーの作成順（\`createdAt\` 昇順）で先頭を採用` — matches the `asc(approvalPolicies.createdAt)` call in `approvalPolicyRepository.findActiveByTriggerAction` and `tasks.md T-03`.

### F-04 [LOW] TC-033（skipPolicyCheck 無限ループ防止）が動的テストでカバーされていない
- **Status**: ✅ FIXED
- **Evidence**: `approvalPolicyFlow.test.ts` lines 396–460 add a "handleApprovalCompleted — TC-033 skipPolicyCheck 無限ループ防止（動的）" describe block with three spy-based tests:
  1. `inquiry.convert` 完了時に `skipPolicyCheck: true` で `updateInquiryStatus` が呼ばれることを確認
  2. `originTriggerAction` が `inquiry.convert` 以外の場合は呼び出しなし
  3. `originTriggerEntityId` が `null` の場合は呼び出しなし

### F-05 [HIGH] 監査ログ metadata に templateId が欠落
- **Status**: ✅ FIXED
- **Evidence**: `updateInquiryStatus.ts` line 126: `metadata: { originType: "system", policyId: policy.id, templateId: template.id }`. `templateId` is present, enabling `existsPendingByTemplateId` to detect system-generated pending requests before template deletion.

### F-06 [MEDIUM] ポリシーゲート発動時に引合側の監査ログが記録されない
- **Status**: ✅ FIXED
- **Evidence**: `updateInquiryStatus.ts` lines 132–146 add a second `auditLogRepository.create` call with `action: "inquiry.conversionPending"`, `targetType: "inquiry"`, `targetId: data.inquiryId`, and `metadata: { fromStatus, pendingApprovalRequestId, policyId }`. Inquiry-side audit trail is complete.

### F-07 [LOW] テンプレート不在フォールバック時に警告ログが出力されない（その1）
- **Status**: ✅ FIXED
- **Evidence**: `updateInquiryStatus.ts` lines 176–179 emit `console.warn` with policy ID and templateId when `approvalTemplateRepository.findById` returns `null`:
  ```
  [updateInquiryStatus] Template not found for policy ${policy.id} (templateId: ${policy.templateId}) — falling back to direct deal creation
  ```

### F-08 [LOW] TOCTOU 競合条件 — 重複チェックとリクエスト作成が同一トランザクション外
- **Status**: ✅ ACCEPTED / MITIGATED
- **Evidence**: `updateInquiryStatus.ts` lines 50–57 retain `findByOriginTriggerEntity` as a best-effort duplicate guard. The residual race condition is explicitly accepted in `design.md` Trade-offs and spec-review-result-003. Root fix (DB partial unique constraint) remains out of scope.

### F-09 [LOW] テンプレート不在フォールバック時に警告ログがない（iter-1 残存）
- **Status**: ✅ FIXED
- **Evidence**: Same fix as F-07. The single `console.warn` at `updateInquiryStatus.ts` lines 176–179 covers both F-07 and F-09 (they referenced the same code path).

### F-10 [LOW] 重複チェックとリクエスト作成の間の TOCTOU 競合条件が残存（iter-1 残存）
- **Status**: ✅ ACCEPTED / MITIGATED
- **Evidence**: Same as F-08. Duplicate check present; risk explicitly accepted.

---

## Contradictions / New Issues

None detected.

---

## Conclusion

All findings from the Iteration 2 ledger are resolved. The implementation is consistent with the design specification and all acceptance criteria are addressed.
