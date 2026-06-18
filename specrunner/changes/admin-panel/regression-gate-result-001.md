# Regression Gate Result — iteration 001

- **verdict**: needs-fix
- **iteration**: 001

## Summary

4件の修正済み所見を検証した。2件は修正が維持されており、2件は未修正のまま（修正が適用されていない）。

## Finding Status

| # | Original Severity | File | Status | Notes |
|---|-------------------|------|--------|-------|
| 1 | medium | `src/app/actions/templates.ts` | ✅ still-fixed | `createTemplateAction`（lines 54–59）・`updateTemplateAction`（lines 117–123）ともに `JSON.parse` を try-catch で保護済み |
| 2 | medium | `src/app/(dashboard)/settings/templates/TemplateForm.tsx` | ✅ still-fixed | `router.push` は `useEffect`（lines 63–68）内に移動済み |
| 3 | low | `src/infrastructure/repositories/approvalTemplateRepository.ts` | ❌ regression | JSDoc（lines 46–55）は依然として `create` 関数の直前に存在し、`findByOrganizationForAmount`（line 127）の直前には移動されていない |
| 4 | low | `src/app/(dashboard)/settings/templates/page.tsx` | ❌ regression | `handleDelete` は `deleteTemplateAction` の戻り値を無視しており、削除失敗時のエラーメッセージが UI に表示されない |

## Regressions

### [HIGH] JSDoc が依然として `create` 関数の直前に誤配置されている
- **File**: `src/infrastructure/repositories/approvalTemplateRepository.ts:46`
- **Severity**: high
- **Resolution**: fixable
- **Detail**: `findByOrganizationForAmount` の説明を記述した JSDoc コメント（lines 46–55）が `create` 関数の直前に残ったまま。`findByOrganizationForAmount`（line 127）の直前に移動する必要がある。

### [HIGH] 削除エラーが UI に表示されない
- **File**: `src/app/(dashboard)/settings/templates/page.tsx:53`
- **Severity**: high
- **Resolution**: fixable
- **Detail**: インライン Server Function `handleDelete` が `deleteTemplateAction` の戻り値を `await` するのみで結果を捨てている。使用中テンプレートの削除を試みた際にユーザーへのエラー表示がない。`DeleteButton` Client Component を切り出して `useActionState` でエラー状態を管理し、エラーメッセージを表示する。
