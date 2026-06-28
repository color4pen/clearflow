# Review Result — domain-invariants — account-settings — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検査サマリー

| 観点 | 結果 |
|------|------|
| テナント分離 — repository WHERE 句 | ✅ PASS |
| テナント分離 — Server Action 入力スコープ | ✅ PASS |
| 監査ログ — AuditAction 追加 | ✅ PASS |
| 監査ログ — トランザクション原子性 | ✅ PASS |
| 監査ログ — actorId / targetId 整合 | ✅ PASS |
| 監査ログ — organizationId 記録 | ✅ PASS |
| 承認ワークフロー不変条件 | ✅ PASS |
| findById 安全 projection 維持 | ✅ PASS |

---

## テナント分離

### INV-T1: 新規 repository メソッドの WHERE 句

以下の 3 メソッドがすべて `and(eq(users.id, id), eq(users.organizationId, organizationId))` で絞られていることを確認。クロステナント参照・更新の経路が存在しない。

| メソッド | WHERE 条件 | 結果 |
|---------|-----------|------|
| `findByIdForAuth` | `(id, organizationId)` | ✅ |
| `updateProfile` | `(id, organizationId)` | ✅ |
| `updatePassword` | `(id, organizationId)` | ✅ |

```ts
// userRepository.ts — 代表例 (findByIdForAuth)
.where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
```

### INV-T2: Server Action による入力スコープ固定

`account.ts` は `userId` と `organizationId` を `session.user.*` から取得し、FormData からは受け取らない。攻撃者が他テナント・他ユーザーの ID を注入できる経路を持たない。

```ts
// account.ts
const session = await auth();
userId: session.user.id,
organizationId: session.user.organizationId,
```

テスト (`accountActions.test.ts`) が `formData.get("userId")` の不存在と `session.user.organizationId` の使用を静的解析で検証している。

### INV-T3: 既存 findByEmailForAuth のテナント分離（参考確認）

`findByEmailForAuth` は email ベースで organizationId を含まないが、これは今回の変更範囲外の既存実装。スキーマ上 email は UNIQUE 制約があり、クロステナント参照は発生しない。今回の変更はこの関数に手を加えていない。

---

## 監査ログの完全性

### INV-A1: AuditAction 型への追加

`src/domain/models/auditLog.ts` に `"user.updatePassword"` が追加されており、型レベルで不正アクションの記録を防ぐ。既存の `"user.create"` / `"user.updateRole"` は変更なし。

```ts
| "user.create"
| "user.updateRole"
| "user.updatePassword"   // ← 追加
| "organization.update";
```

### INV-A2: 監査ログとパスワード更新のトランザクション原子性

`changeOwnPassword.ts` が `db.transaction` 内で `updatePassword` と `recordAudit` を順次実行している。どちらかが失敗すれば両方ロールバックされ、「パスワードは変わったが監査ログが記録されない」または「監査ログのみ記録されパスワードは変わらない」状態が発生しない。

```ts
await db.transaction(async (tx) => {
  const updated = await userRepository.updatePassword(..., tx);
  if (!updated) throw new Error("パスワードの更新に失敗しました");
  await recordAudit({ action: "user.updatePassword", ... }, tx);
});
```

### INV-A3: actorId / targetId の整合

パスワード変更は本人操作のため `actorId === targetId === userId` が正しい。実装はこれに準拠している。

```ts
actorId: data.userId,
targetId: data.userId,
organizationId: data.organizationId,
```

### INV-A4: 表示名変更の監査省略（設計判断 D4）

`updateOwnProfile` は `recordAudit` を呼ばない。これは要件・設計書の D4「パスワード変更のみ監査」に沿った意図的な判断であり、不変条件の違反ではない。テスト (`accountSettings.test.ts`) が `recordAudit` を呼ばないことを静的解析で固定している。

---

## 承認ワークフローの不変条件

### INV-W1: 承認ワークフロー関連コードへの影響なし

差分は以下の新規ファイルと既存ファイルへの追記のみであり、承認ワークフローのドメインロジックに手を加えていない。

- 変更された既存ファイル: `auditLog.ts`（AuditAction 追加のみ）、`userRepository.ts`（メソッド追加のみ）、`usecases/index.ts`（export 追加のみ）、`SidebarNav.tsx`（nav 項目追加のみ）
- 変更なし: `approveRequest.ts`, `rejectRequest.ts`, `createRequest.ts`, `evaluatePolicies.ts`, `createDelegation.ts`, `deactivateDelegation.ts` 等すべての承認ワークフロー usecase

### INV-W2: AuditAction 拡張の後方互換性

`AuditAction` は union 型であり、`"user.updatePassword"` の追加は既存の switch/if に影響を与えない（TypeScript の exhaustive check がある場合のみ型エラーになるが、本プロジェクトの `recordAudit` は generic 型で安全に受け入れる）。承認ワークフローが dispatch または switch する `request.*` / `approval_step.*` のアクションは変更されていない。

---

## findById 安全 projection 維持

`findById` の select オブジェクトに `hashedPassword` が含まれないことを静的解析テストで固定済み（`accountRepository.test.ts`）。実装も同様に確認した。`findByIdForAuth` が新たな専用取得経路として分離されており、`findById` の投影を汚染していない。

---

## 総合評価

本変更はテナント分離・監査ログの完全性・承認ワークフローの不変条件のいずれも破壊していない。

- **verdict**: approved
