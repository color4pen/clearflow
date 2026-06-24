# Regression Gate Result — Iteration 4

- **verdict**: needs-fix

## Summary

9 findings were claimed fixed in iter 4. Verified 3 as fixed; 6 remain unresolved (same regressions as iter 3).

## Finding Status

### FIXED ✓

| # | Severity | Title | Evidence |
|---|----------|-------|----------|
| 4 | HIGH | 監査ログ欠落 | `createPolicy.ts`, `updatePolicy.ts`, `togglePolicy.ts` が全て `db.transaction()` 内で `auditLogRepository.create()` を呼び出している |
| 5 | MEDIUM | templateId クロステナント参照検証なし | `createPolicy.ts:25-31`, `updatePolicy.ts:26-32` が `approvalTemplateRepository.findById(templateId, organizationId)` でテナント検証を実施 |
| 7 | HIGH | 4件の静的解析テスト失敗 | テストが usecase ファイルを参照するよう更新済み。`createPolicy.ts` → `approvalPolicyRepository.create`、`updatePolicy.ts` → `approvalPolicyRepository.updateById`、`togglePolicy.ts` → `approvalPolicyRepository.findById` + `!current.isActive` が全て存在 |

### NOT FIXED (regressions)

#### [LOW] Finding 1: LinkButton 未使用 — 生の `<a>` タグを使用
- **File**: `src/app/(dashboard)/settings/policies/PolicyForm.tsx:250`
- **Severity**: low
- **Resolution**: fixable
- **Evidence**: `LinkButton` は `@/app/components` から export されているが PolicyForm は import していない。キャンセルリンクが `<a href="/settings/policies" className="text-xs text-text-muted underline">` のまま。iter 1〜4 で継続未対応。

#### [LOW] Finding 2: isAdmin を role 直比較で算出
- **File**: `src/app/(dashboard)/settings/policies/page.tsx:19`
- **Severity**: low
- **Resolution**: fixable
- **Evidence**: `const isAdmin = session.user.role === "admin";` が残存。`canPerform(session.user.role, "approvalSettings", "createPolicy")` は admin のみ true を返すため代替可能。iter 1〜4 で継続未対応。

#### [LOW] Finding 3: id フィールドの二重設定
- **File**: `src/app/(dashboard)/settings/policies/PolicyForm.tsx:55,100`
- **Severity**: low
- **Resolution**: fixable
- **Evidence**: `boundAction` 内の `formData.set("id", policyId)` (line 55) と `<input type="hidden" name="id" value={props.policyId} />` (line 100) の両方が存在する冗長な実装が残存。iter 1〜4 で継続未対応。

#### [LOW] Findings 6/8/9: triggerAction が z.enum() 未適用（4イテレーション連続未解消）
- **File**: `src/app/actions/policies.ts:17`
- **Severity**: low
- **Resolution**: fixable
- **Evidence**: `triggerAction: z.string().min(1, "トリガーアクションは必須です")` のまま。同ファイルの `CONDITION_OPERATORS` は `as const` 配列 + `z.enum()` で正しく制限されているが、triggerAction に同パターンが適用されていない。`TRIGGER_ACTION_OPTIONS` の 3 値（`inquiry.convert` / `contract.create` / `contract.cancel`）で `z.enum()` に置き換えることで Server Action への直接呼び出しによるサイレントスキップを防止できる。iter 1・2・3・4 と 4 回連続未対応。
