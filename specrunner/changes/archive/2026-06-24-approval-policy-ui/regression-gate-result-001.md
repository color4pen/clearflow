# Regression Gate Result — approval-policy-ui / Iteration 1

- **verdict**: needs-fix
- **checked-at**: 2026-06-24

## Summary

9 findings checked. 3 confirmed fixed, 6 regressions detected (covering 4 distinct issues, with the triggerAction z.enum() issue counted across 3 duplicate findings).

---

## Verified Fixed

### Finding 4 — 監査ログ欠落
- **Status**: FIXED
- createPolicy.ts / updatePolicy.ts / togglePolicy.ts すべてが `db.transaction` 内で `auditLogRepository.create()` を呼び出している。

### Finding 5 — templateId のクロステナント参照検証なし
- **Status**: FIXED
- createPolicy.ts / updatePolicy.ts が `approvalTemplateRepository.findById(templateId, organizationId)` でテナント所属を検証している。

### Finding 7 — 4件の静的解析テストが失敗
- **Status**: FIXED
- TC-010〜TC-012 がそれぞれ `createPolicy.ts` / `updatePolicy.ts` / `togglePolicy.ts` を参照するよう更新されており、`approvalPolicyRepository.create` / `updateById` / `findById` / `!current.isActive` がすべて存在する。

---

## Regressions

### [LOW] Finding 1 — LinkButton 未使用（生の `<a>` タグ）
- **File**: src/app/(dashboard)/settings/policies/PolicyForm.tsx:250
- **Resolution**: fixable
- **Status**: REGRESSION
- キャンセルリンクが `<a href="/settings/policies" ...>` のまま。`@/app/components` から `LinkButton` が export されているが import・使用されていない。

### [LOW] Finding 2 — isAdmin を role 直比較で算出
- **File**: src/app/(dashboard)/settings/policies/page.tsx:19
- **Resolution**: fixable
- **Status**: REGRESSION
- `const isAdmin = session.user.role === "admin";` のまま。設計 D5 が示す `canPerform` による認可マトリクス一元管理に反する。

### [LOW] Finding 3 — id フィールドの二重設定
- **File**: src/app/(dashboard)/settings/policies/PolicyForm.tsx:55,100
- **Resolution**: fixable
- **Status**: REGRESSION
- `formData.set("id", policyId)`（line 55）と `<input type="hidden" name="id" value={props.policyId} />`（line 100）が共存したまま。どちらか一方に統一されていない。

### [LOW] Findings 6 / 8 / 9 — triggerAction が z.enum() 未適用
- **File**: src/app/actions/policies.ts:17
- **Resolution**: fixable
- **Status**: REGRESSION（3イテレーション連続未解消）
- `triggerAction: z.string().min(1, ...)` のまま。`z.enum(["inquiry.convert", "contract.create", "contract.cancel"])` への置き換えが未実施。未定義の triggerAction 値が DB に保存されると `evaluatePolicies.ts` でサイレントスキップが発生する。
