# Regression Gate Result — Iteration 5

- **verdict**: approved

## Summary

All 9 findings from the ledger are verified as fixed. Full test suite passes (890 pass / 0 fail).

---

## Finding Verification

### [LOW] LinkButton 未使用 — 生の <a> タグを使用
- **File**: `src/app/(dashboard)/settings/policies/PolicyForm.tsx`
- **Status**: ✅ Fixed
- `LinkButton` is imported from `@/app/components` (line 10) and used for the cancel button (lines 246–251). No raw `<a>` tags remain.

### [LOW] isAdmin を role 直比較で算出 — 設計 D5 の canPerform 方針から逸脱
- **File**: `src/app/(dashboard)/settings/policies/page.tsx:19`
- **Status**: ✅ Fixed
- Line 19 now uses `canPerform(session.user.role, "approvalSettings", "createPolicy")` — no direct `role === "admin"` comparison.

### [LOW] id フィールドの二重設定（hidden input と formData.set の重複）
- **File**: `src/app/(dashboard)/settings/policies/PolicyForm.tsx:55`
- **Status**: ✅ Fixed
- Only a single `<input type="hidden" name="id" value={props.policyId} />` exists (line 96). No `formData.set("id", ...)` call is present. Duplication is eliminated.

### [HIGH] 監査ログ欠落 — ポリシー CRUD 操作が auditLogRepository を呼び出さない
- **File**: `src/app/actions/policies.ts`
- **Status**: ✅ Fixed
- `createPolicy.ts`, `updatePolicy.ts`, and `togglePolicy.ts` each import `auditLogRepository` and call `auditLogRepository.create()` atomically within a `db.transaction()` block. Actions: `policy.create`, `policy.update`, `policy.activate`/`policy.deactivate`.

### [MEDIUM] templateId のクロステナント参照検証なし
- **File**: `src/app/actions/policies.ts`
- **Status**: ✅ Fixed
- Both `createPolicy.ts` and `updatePolicy.ts` call `approvalTemplateRepository.findById(data.templateId, data.organizationId)` before any write, returning an error if the template does not belong to the requesting organization.

### [LOW] triggerAction が enum で制限されず、未定義値による evaluatePolicies のサイレント障害リスク (Finding 6)
- **File**: `src/app/actions/policies.ts:16`
- **Status**: ✅ Fixed
- `policySchema.triggerAction` uses `z.enum(["inquiry.convert", "contract.create", "contract.cancel"])`, rejecting any value outside the three defined trigger actions.

### [HIGH] 4件の静的解析テストが失敗 — usecase 抽出によりアサーション対象が陳腐化
- **File**: `src/__tests__/settings/policiesActions.test.ts:63`
- **Status**: ✅ Fixed
- TC-010 now reads `application/usecases/createPolicy.ts` for `approvalPolicyRepository.create`. TC-011 reads `updatePolicy.ts` for `approvalPolicyRepository.updateById`. TC-012 reads `togglePolicy.ts` for `approvalPolicyRepository.findById` and `!current.isActive`. All 17 tests in the file pass.

### [LOW] triggerAction が z.string().min(1) のみで受け入れ値を制限しない（iter 1 Finding 3 持ち越し）
- **File**: `src/app/actions/policies.ts:17`
- **Status**: ✅ Fixed (same fix as Finding 6 above)

### [LOW] triggerAction が z.string().min(1) のまま — z.enum() 未適用（iter 1 からの 3 回目持ち越し）
- **File**: `src/app/actions/policies.ts:17`
- **Status**: ✅ Fixed (same fix as Finding 6 above)

---

## Test Run

```
890 pass / 0 fail
Ran 890 tests across 43 files.
```
