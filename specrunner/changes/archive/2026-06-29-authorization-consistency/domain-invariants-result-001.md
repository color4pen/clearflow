# Domain Invariants Review Result — authorization-consistency — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検証対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/app/actions/requests.ts` | インライン `role === "member"` → `canPerform` 置換（3箇所） |
| `src/application/usecases/updateUserRole.ts` | 最後の admin ガード追加 |
| `src/__tests__/actions/approvalRoleCheck.test.ts` | 新規テスト（静的検証） |
| `src/__tests__/usecases/userManagement.test.ts` | 最後の admin ガード用テスト追加 |

---

## 不変条件 1: テナント分離

### 結果: **OK**

**最後の admin ガード (`findByOrganization`)**

```ts
const orgUsers = await userRepository.findByOrganization(data.organizationId);
const otherAdmins = orgUsers.filter(
  (u) => u.role === "admin" && u.id !== data.targetUserId
);
```

`findByOrganization` の実装を確認した:

```ts
.where(eq(users.organizationId, organizationId))
```

`organizationId` によるフィルタが明示されており、他テナントのユーザーが admin カウントに混入するリスクはない。

**`updateRole` の WHERE 条件**

```ts
.where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
```

id と organizationId の複合条件。クロステナント更新は発生しない。

**`canPerform` の変更**

`canPerform(role, entity, operation)` は純粋関数でありテナント状態を参照しない。テナント分離への影響なし。

---

## 不変条件 2: 監査ログの完全性

### 結果: **OK**

**updateUserRole の監査ログ**

ロール変更が成功したパスで `recordAudit` がトランザクション内部で呼ばれることを確認した:

```ts
await db.transaction(async (tx) => {
  await userRepository.updateRole(..., tx);
  await recordAudit({
    action: "user.updateRole",
    targetType: "user",
    targetId: data.targetUserId,
    actorId: data.actorId,
    organizationId: data.organizationId,
    metadata: { oldRole, newRole: data.newRole },
  }, tx);
});
```

- 状態変化（updateRole）と監査記録（recordAudit）が同一トランザクションにある
- `oldRole` と `newRole` の両方が metadata に含まれる
- `organizationId` が監査レコードに含まれる（テナントを特定可能）

**ガードで拒否されたケースの監査ログ**

最後の admin ガード・自己降格ガードで拒否された場合、監査ログは記録されない。これは状態変化がないため許容される（既存の自己降格ガードと同一設計）。本リクエストのスコープでは監査要件は変更成功ケースに限定されており問題なし。

**承認操作の監査ログ (変更外・確認のみ)**

`approveRequest` / `rejectRequest` usecase は変更されておらず、引き続きトランザクション内で `recordAudit` を呼び出す。`canPerform` ゲートはアクション層で先に評価され、拒否された場合は usecase に入らない。監査ログの完全性に変化なし。

---

## 不変条件 3: 承認ワークフローの不変条件

### 結果: **OK**

**canPerform 置換の等価性**

RBAC マトリクスの確認:

```ts
approval: {
  approve: ADMIN_MANAGER_FINANCE,   // ["admin", "manager", "finance"]
  reject:  ADMIN_MANAGER_FINANCE,
}
```

| ロール | 旧: `role === "member"` で拒否 | 新: `canPerform` | 等価か |
|-------|-------------------------------|-----------------|-------|
| admin | 通過 | true | ✓ |
| manager | 通過 | true | ✓ |
| finance | 通過 | true | ✓ |
| member | 拒否 | false | ✓ |

現在の4ロールにおいて振る舞いは完全に等価。  
なお、新実装は deny-by-default（マトリクス未定義ロールを拒否）であるため、将来の新ロール追加時は旧実装（member でなければ通す）よりも安全な挙動となる。これは認可設計の中央化原則に沿った改善である。

**ステップ承認者ロール一致・委任の追加判定**

`approveRequest` usecase の `canApproveWithDelegation` による追加判定は本変更の対象外。コードを確認し、変更されていないことを確認した。

**一括承認 (bulkApproveAction)**

`canPerform(role, "approval", "approve")` に置換されており、`approveRequestAction` と同一の操作キーを使用している。整合性OK。

---

## 不変条件 4: 最後の admin ガードのロジック検証

### 結果: **OK**

**条件判定の正確性**

```ts
if (currentUser.role === "admin" && data.newRole !== "admin") {
  const orgUsers = await userRepository.findByOrganization(data.organizationId);
  const otherAdmins = orgUsers.filter(
    (u) => u.role === "admin" && u.id !== data.targetUserId
  );
  if (otherAdmins.length === 0) {
    return { ok: false, reason: "組織に最低1人の管理者が必要です" };
  }
}
```

| シナリオ | 期待 | 実装 |
|---------|------|------|
| 最後の1人の admin を降格 | 拒否 | `otherAdmins.length === 0` → 拒否 ✓ |
| 他に admin がいれば降格 | 許可 | `otherAdmins.length > 0` → 通過 ✓ |
| admin → admin の同値変更 | 通過 | `data.newRole !== "admin"` が false → ガード未実行 ✓ |
| non-admin の降格 | ガード対象外 | `currentUser.role === "admin"` が false → ガード未実行 ✓ |

**ガードの評価順序**

1. 自己降格ガード（L20）— repository アクセス不要の軽量チェック
2. `findById` によるユーザー存在確認（L25-31）
3. 最後の admin ガード（L36-44）— `currentUser.role` を参照するため findById の後が正しい
4. `db.transaction` 実行（L46-）

仕様 (D5) 通りの順序。自己降格ガードが最後の admin ガードより先に評価されることを確認。

---

## 不変条件 5: 依存方向

### 結果: **OK**

- `src/app/actions/requests.ts` → `@/domain/authorization` (canPerform): actions → domain ✓
- `src/application/usecases/updateUserRole.ts` → `@/infrastructure/repositories` (findByOrganization): usecases → infrastructure ✓
- domain 層は変更なし。副作用を持たない純粋関数のまま ✓

---

## 所見

### WARN-01: TOCTOU レース条件（軽微）

`findByOrganization` はトランザクション外で呼ばれるため、チェックと更新の間に理論上のレース条件がある。admin A と admin B が同時に互いを降格しようとした場合、両者がガードを通過してしまい admin 不在が生じる可能性がある。

**評価**:
- ロール変更は管理操作であり頻度が極めて低い
- 2人の管理者が同時に互いを降格するというシナリオは実用上発生しにくい
- design.md D3/D4 でこの設計（usecase 層配置・既存 `findByOrganization` 利用）が選択されており、architect 承認済み
- `findByOrganization` はトランザクション引数 (`tx`) を受け取らないため、ガードをトランザクション内に移動させるには API 変更が必要（スコープ外）

**判断**: 現状の設計判断の範囲内で許容。将来ロール変更の頻度が上がるか、より厳密な保証が必要になった場合は `findByOrganization` に `tx` 引数を追加してトランザクション内チェックを検討すること。

---

## 総合判定

すべての不変条件が維持されている:

- テナント分離: `findByOrganization` が `organizationId` スコープでフィルタリング ✓
- 監査ログ完全性: `updateUserRole` の recordAudit がトランザクション内で oldRole/newRole を記録 ✓
- 承認ワークフロー: canPerform 置換が現4ロールで等価、ステップ承認の追加判定を維持 ✓
- 自己降格ガード: 変更なし、評価順序が正しい ✓
- 依存方向: actions → domain、usecases → infrastructure ✓

WARN-01 (TOCTOU) は軽微であり、architect 承認済みの設計判断の範囲内。本変更による不変条件の破壊はない。
