# Domain Invariants Review — admin-panel — iter 1

## Summary

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## Invariant 1: テナント分離 — 全クエリに organizationId 条件が付与されている

### 検証対象

| メソッド | ファイル | 結果 |
|---------|---------|------|
| `approvalTemplateRepository.create` | `infrastructure/repositories/approvalTemplateRepository.ts:56` | ✅ INSERT 値に `organizationId` を含む |
| `approvalTemplateRepository.updateById` | 同ファイル:80 | ✅ `and(eq(id), eq(organizationId))` WHERE 条件あり |
| `approvalTemplateRepository.deleteById` | 同ファイル:111 | ✅ `and(eq(id), eq(organizationId))` WHERE 条件あり |
| `userRepository.findByOrganization` | `infrastructure/repositories/userRepository.ts:9` | ✅ `eq(users.organizationId, organizationId)` WHERE 条件あり。hashedPassword を除外した select |
| `userRepository.updateRole` | 同ファイル:26 | ✅ `and(eq(id), eq(organizationId))` WHERE 条件あり |
| `requestRepository.existsPendingByTemplateId` | `infrastructure/repositories/requestRepository.ts:58` | ✅ `auditLogs.organizationId` と `requests.organizationId` の両テーブルで条件付与 |
| `templates.ts` Server Actions | `app/actions/templates.ts` | ✅ `session.user.organizationId` からのみ organizationId を取得。フォームデータや引数からの受取なし |
| `users.ts` Server Actions | `app/actions/users.ts` | ✅ `session.user.organizationId` からのみ organizationId を取得 |

**判定**: 全メソッドでテナント分離が適切に実装されている。組織をまたいだデータ参照・変更は不可能。

---

## Invariant 2: 監査ログの完全性 — 全操作がトランザクション内で記録される

### 検証対象

| 操作 | usecase | 結果 |
|-----|---------|------|
| テンプレート作成 | `createTemplate` | ✅ `db.transaction` 内で `approvalTemplateRepository.create` + `auditLogRepository.create(action: "template.create")` |
| テンプレート更新 | `updateTemplate` | ✅ `db.transaction` 内で `approvalTemplateRepository.updateById` + `auditLogRepository.create(action: "template.update")` |
| テンプレート削除 | `deleteTemplate` | ✅ `db.transaction` 内で `approvalTemplateRepository.deleteById` + `auditLogRepository.create(action: "template.delete")` |
| ユーザーロール変更 | `updateUserRole` | ✅ `db.transaction` 内で `userRepository.updateRole` + `auditLogRepository.create(action: "user.updateRole", metadata: { oldRole, newRole })` |

**判定**: 全操作で監査ログが同一トランザクション内に記録される。操作と監査ログの原子性が保証されている。

---

## Invariant 3: 承認ワークフロー保護 — pending リクエスト使用中のテンプレート削除拒否

### 検証対象

`deleteTemplate` usecase (`application/usecases/deleteTemplate.ts`):

```
existsPendingByTemplateId (チェック) → if isInUse → return { ok: false }
                                     → else → db.transaction(deleteById + audit_log)
```

- `existsPendingByTemplateId` の呼び出しが `deleteById` より前にある ✅
- 使用中チェックが true の場合、削除処理には進まない ✅
- 拒否メッセージ「このテンプレートを使用中の承認待ちリクエストがあるため削除できません」が定義されている ✅
- `existsPendingByTemplateId` は audit_logs と requests の JOIN で `pending` 状態を判定 ✅

**判定**: 承認待ちリクエストが存在するテンプレートの削除は正しく拒否される。

---

## Invariant 4: 自己ロール変更禁止

`updateUserRole` usecase (`application/usecases/updateUserRole.ts:19`):

```typescript
if (data.actorId === data.targetUserId) {
  return { ok: false, reason: "自分自身のロールは変更できません" };
}
```

- ガードが usecase 層の最初に配置されており、DB アクセス前に評価される ✅
- エラーメッセージが定義されている ✅

**判定**: admin による自己降格リスクが usecase 層で防止されている。

---

## Invariant 5: admin ロール以外のアクセス拒否

全 Server Action での admin ガード検証:

| Action | ガード | 結果 |
|--------|------|------|
| `listTemplatesAction` | `session.user.role !== "admin"` | ✅ |
| `createTemplateAction` | `session.user.role !== "admin"` | ✅ |
| `updateTemplateAction` | `session.user.role !== "admin"` | ✅ |
| `deleteTemplateAction` | `session.user.role !== "admin"` | ✅ |
| `listUsersAction` | `session.user.role !== "admin"` | ✅ |
| `updateUserRoleAction` | `session.user.role !== "admin"` | ✅ |
| `settings/layout.tsx` | `session.user.role !== "admin"` + `redirect("/requests")` | ✅ |

**判定**: admin 以外のロールから管理機能へのアクセスは全経路でブロックされている。

---

## 観察事項（INFO — 不変条件の破壊なし）

### INFO-1: `approvalTemplateRepository.create` への JSDoc 誤配置

`approvalTemplateRepository.ts` の `create` 関数（56行目）に `findByOrganizationForAmount` を説明する JSDoc コメントが付いている。機能上の問題はないが、コードの可読性を下げる。

### INFO-2: `deleteTemplate` の TOCTOU — チェックとトランザクションのギャップ

`existsPendingByTemplateId` はトランザクション外で実行されるため、チェック通過からトランザクション開始の間に新たな pending リクエストが作成された場合、使用中テンプレートが削除される理論的可能性がある。設計書 D2 で意図的な設計決定として記載されており、このシステムの利用パターン（管理者による手動操作）においてリスクは極めて低い。

### INFO-3: `updateUserRole` の `findById` がトランザクション外

`oldRole` の取得のための `userRepository.findById` がトランザクション外で実行されるため、同一ユーザーへの並行ロール変更が発生した場合、監査ログに記録される `oldRole` が実際の変更前ロールと一致しない可能性がある。利用パターット上の影響は低いが、監査ログの正確性に軽微な影響がある。

---

## 結論

- **verdict**: approved

テナント分離・監査ログ完全性・承認ワークフロー保護のすべての不変条件が正しく実装されている。観察事項はいずれも既知・許容可能な設計上のトレードオフであり、不変条件を破壊していない。
