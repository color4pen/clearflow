# Regression Gate Result — Iteration 1

- **date**: 2026-06-19
- **verdict**: approved

## Summary

全 1 件の finding を検証した。いずれも現在のコードでフィックスが維持されており、リグレッションは検出されなかった。

---

## Finding 検証

### [MEDIUM] `requests.template_id` FK（ON DELETE no action）と `existsPendingByTemplateId`（pending のみチェック）の矛盾

- **File**: src/application/usecases/deleteTemplate.ts
- **Status**: ✅ FIXED（リグレッションなし）

**確認内容**:

1. **FK の ON DELETE 動作が変更済み**
   - `src/infrastructure/schema.ts` line 76: `templateId: uuid("template_id").references(() => approvalTemplates.id, { onDelete: "set null" })`
   - マイグレーション `drizzle/0006_template_form_definition.sql` line 32: `ON DELETE set null ON UPDATE no action`
   - 元の問題であった `ON DELETE no action`（FK 違反エラー）ではなく、`ON DELETE set null` になっている。テンプレート削除時に承認済み/却下済み申請の `templateId` は NULL に設定されるため、FK 違反が発生しない。

2. **`deleteTemplate.ts` のビジネスロジック（pending チェック）は適切**
   - `existsPendingByTemplateId` で pending 申請の有無を確認し、存在する場合はユーザーフレンドリーなエラーメッセージを返す（line 17–28）
   - FK が `set null` になったことで、pending 以外（approved/rejected）の申請が存在してもテンプレート削除が DB エラーなく成功する
   - ビジネス要件「承認待ちリクエストがある場合のみ削除不可」と FK 制約が一致している

3. **矛盾の解消**
   - 旧: `ON DELETE no action` → 申請が1件でもあれば DB FK 違反、`existsPendingByTemplateId` と矛盾
   - 現: `ON DELETE set null` → 削除時に `templateId` を NULL 化、pending チェックは business rule として正常に機能

**結論**: フィックスは維持されており、リグレッションなし。
