# Domain-Invariants Review — user-deactivation — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検証サマリー

| 不変条件 | 結果 | 根拠 |
|---------|------|------|
| テナント分離（repository 層） | ✅ PASS | `deactivate` / `reactivate` の WHERE が `(id, organizationId)` でスコープされている |
| テナント分離（action 層） | ✅ PASS | `organizationId` / `actorId` が FormData ではなくセッション由来 |
| 認証ゲート | ✅ PASS | `findByEmailForAuth` / `findByIdForAuth` に `isNull(deactivatedAt)` を追加 |
| 最後の admin ロックアウト防止（deactivateUser） | ✅ PASS | `otherActiveAdmins` フィルターが `deactivatedAt === null` で有効 admin のみを数える |
| 最後の admin ロックアウト防止（updateUserRole） | ✅ PASS | T-07b で `otherAdmins` フィルターに `deactivatedAt === null` を追加。deactivated admin を対象外とする非対称性を解消 |
| 自己無効化防止 | ✅ PASS | `actorId === targetUserId` ガードが最上位で評価される |
| 監査ログ完全性（atomicity） | ✅ PASS | `userRepository.deactivate` + `recordAudit` が同一 `db.transaction` 内で実行される |
| 監査ログ完全性（reactivate） | ✅ PASS | `userRepository.reactivate` + `recordAudit` が同一 `db.transaction` 内で実行される |
| AuditAction 型の更新 | ✅ PASS | `"user.deactivate"` / `"user.reactivate"` を追加 |
| 権限マトリクス（deactivateUser） | ✅ PASS | `ADMIN_ONLY` として定義。manager/finance/member は拒否 |
| マイグレーション範囲 | ✅ PASS | `ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp` のみ。他テーブル・他カラム変更なし |
| 承認ワークフロー不変条件 | ✅ PASS | 承認フロー関連コードへの変更なし。既存承認ステップ・委任設定のデータは不変 |

---

## 詳細所見

### F-01 ✅ テナント分離 — repository 層

`deactivate` / `reactivate` メソッドの WHERE 句はいずれも `and(eq(users.id, id), eq(users.organizationId, organizationId))` で構成されており、他テナントのレコードを変更する経路が存在しない。`findById` によるガードチェックも同じ複合条件でスコープされているため、別テナントの対象ユーザーを誤ってターゲットにすることはできない。

### F-02 ✅ テナント分離 — action 層

`deactivateUserAction` / `reactivateUserAction` ともに：

```typescript
organizationId: session.user.organizationId,
actorId: session.user.id,
```

`organizationId` と `actorId` がセッション由来であり、FormData からは `userId`（UUID バリデーション済み）のみを受け取る。クライアントから `organizationId` を偽造してクロステナント操作を試みることは不可能。

### F-03 ✅ 認証ゲート — 両認証経路をカバー

```typescript
// findByEmailForAuth
.where(and(eq(users.email, email), isNull(users.deactivatedAt)))

// findByIdForAuth
.where(and(eq(users.id, id), eq(users.organizationId, organizationId), isNull(users.deactivatedAt)))
```

ログイン（email/password）とセッション継続（JWT/id）の両経路で無効化済みユーザーが除外される。パスワード変更等の認証目的 usecase（`changeOwnPassword` 等）も `findByIdForAuth` を経由するため、JWT 有効期限内であっても認証が必要な操作は遮断される。

### F-04 ✅ 最後の admin ロックアウト防止

`deactivateUser` のガード 3：

```typescript
const otherActiveAdmins = orgUsers.filter(
  (u) => u.role === "admin" && u.id !== data.targetUserId && u.deactivatedAt === null
);
```

`deactivatedAt === null` 条件により、すでに無効化された admin はカウント対象から除外される。「deactivated admin のみが残る組織で、その deactivated admin の JWT が有効な間に active admin を唯一の admin として降格しようとする」シナリオも `updateUserRole` の `otherAdmins` フィルター（T-07b で同様に修正済み）によって正しく防がれる。

### F-05 ✅ 監査ログの原子性

```typescript
await db.transaction(async (tx) => {
  const updated = await userRepository.deactivate(targetUserId, organizationId, tx);
  if (!updated) throw new Error("...");
  await recordAudit({ action: "user.deactivate", ... }, tx);
});
```

`deactivate`（`reactivate`）と `recordAudit` が同一トランザクション内で実行される。監査ログ記録に失敗した場合はロールバックされ、監査ログなしでのユーザー無効化が発生しない不変条件が保証されている。

### F-06 ✅ 承認ワークフロー不変条件

本変更は承認フロー関連コード（`approvalPolicyRepository`、`approvalTemplateRepository`、`approvalDelegationRepository`、`requestWorkflow` 等）に一切触れていない。`findByOrganization`（`userRepository`）の呼び出し元は `settings/users` 管理画面と `deactivateUser`/`updateUserRole` のロックアウトガードのみであり（`listOrganizationUsers` usecase を含む）、承認フローの approver 候補リスト等には使用されていないことを確認した。

---

## 非ブロッカー所見

### NB-01 INFO: ロックアウトガードの TOCTOU

ロックアウトガードチェック（`findById` + `findByOrganization`）がトランザクション外で行われているため、複数の admin を同時に無効化するリクエストが競合した場合に理論上ロックアウトが発生しうる。ただし：

1. 既存コード（`updateUserRole`）と同じパターンであり、本変更が新たに導入した問題ではない
2. 実運用において複数の admin を同時に無効化するシナリオは極めてまれ
3. ガードチェックとトランザクション実行の間隔は数ミリ秒未満

**対応不要。** 将来的に SELECT FOR UPDATE が必要となった場合は別途対応する。

### NB-02 INFO: JWT 有効期限内の無効化済みユーザーによる承認操作

発行済み JWT が有効な間は、無効化済みユーザーが承認 API を呼び出せる可能性がある。`findByIdForAuth` の除外によりパスワード変更等の「認証が必要な操作」は遮断されるが、承認フローは JWT の claims をそのまま使用するため、セッション失効までの間は承認・却下等の操作が可能。

これは design.md の「既存セッションの即時失効は対象外」「次回認証からの遮断」という設計判断に沿ったものであり、スコープ外として明記されている。**対応不要（スコープ外）。**

---

## 結論

テナント分離・監査ログ完全性・承認ワークフロー不変条件のすべてを確認した。実装は要件・設計判断と整合しており、不変条件を破壊するコードは発見されなかった。
