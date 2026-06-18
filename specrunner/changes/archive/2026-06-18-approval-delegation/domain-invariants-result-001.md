# domain-invariants Review Result — approval-delegation — iter 001

## Summary

承認ワークフローの主要な不変条件（テナント分離・自己委譲禁止・クロスオーグ禁止・期間重複禁止・TOCTOU 防止・代理承認監査ログ）はすべて正しく実装されている。

一方、`createDelegation` および `deactivateDelegation` usecase において、委譲操作（DB 書き込み）と監査ログ記録が同一トランザクションで保護されていない。DB 障害時に権限委譲の監査ログが欠落するリスクがあり、「監査ログの完全性を保証する」という本レビューの観点に照らして修正が必要と判断する。

---

## Findings

### [MEDIUM] F-01: `createDelegation` — 委譲作成と監査ログがトランザクション外

**場所**: `src/application/usecases/createDelegation.ts:71-93`

**問題**: `approvalDelegationRepository.create()` と `auditLogRepository.create()` が別々の非トランザクション操作として実行される。前者が成功して後者が失敗した場合（DB 接続断・タイムアウト等）、承認権限の委譲が記録されずに有効化されてしまう。

承認権限の委譲はセキュリティ上センシティブな操作であり、「付与したが記録されなかった」状態はコンプライアンス上の問題を引き起こす。

**スペックとの関係**: `spec.md` の「createDelegation SHALL record audit log on success」はバリデーション通過ケースでの記録を意図しているが、DB 障害シナリオでの完全性保証は明示されていない。ドメイン不変条件「監査ログの完全性」の観点からリスクがある。

**修正案**: `approvalDelegationRepository.create()` と `auditLogRepository.create()` を同一 `db.transaction()` 内にまとめる。`approvalDelegationRepository.create` はすでに `tx?` 引数を受け付けており、`auditLogRepository.create` も `tx` を受け付けているため、変更は最小限。

```typescript
// createDelegation.ts — 修正後のイメージ
const delegation = await db.transaction(async (tx) => {
  const created = await approvalDelegationRepository.create({
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    organizationId: data.organizationId,
    startDate: data.startDate,
    endDate: data.endDate,
  }, tx);

  await auditLogRepository.create({
    action: "delegation.create",
    targetType: "delegation",
    targetId: created.id,
    actorId: data.actorId,
    organizationId: data.organizationId,
    metadata: {
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    },
  }, tx);

  return created;
});
```

---

### [MEDIUM] F-02: `deactivateDelegation` — 無効化と監査ログがトランザクション外

**場所**: `src/application/usecases/deactivateDelegation.ts:15-35`

**問題**: `approvalDelegationRepository.update(..., { isActive: false })` と `auditLogRepository.create()` が別々の非トランザクション操作。委譲の無効化が DB に書き込まれた後に監査ログの書き込みが失敗した場合、「無効化されたが記録されない」状態が生じる。F-01 と同様の監査完全性リスク。

**修正案**: F-01 と同様に `db.transaction()` でまとめる。ただし `approvalDelegationRepository.update` は現在 `tx` 引数を受け付けていないため、シグネチャ追加が必要。

```typescript
export async function update(
  id: string,
  organizationId: string,
  data: Partial<{ isActive: boolean }>,
  tx?: Transaction   // ← 追加
): Promise<ApprovalDelegation | null>
```

---

### [MINOR] F-03: `approveRequest.ts` — `canApprove` が未使用インポート

**場所**: `src/application/usecases/approveRequest.ts:11`

**問題**: `canApprove` がインポートされているが、実装では `canApproveWithDelegation` のみが使用される。`verification-result.md` でも ESLint warning（`'canApprove' is defined but never used`）が確認されている。

ロジックに影響はないが、将来の混乱（「canApprove と canApproveWithDelegation を使い分けているのか？」）を招く可能性がある。

**修正**: インポートから `canApprove` を削除する。

---

### [INFO] F-04: スキーマレベルのクロスオーグ制約なし（意図的設計）

**場所**: `src/infrastructure/schema.ts` / `drizzle/0004_far_young_avengers.sql`

**観察**: `approval_delegations.from_user_id` と `to_user_id` は `users.id` への FK のみで、クロスオーグ委譲を DB レベルで防止する制約がない。クロスオーグ防止はアプリケーション層（`createDelegation` usecase の `userRepository.findById(id, organizationId)` で両ユーザーが同一組織に属することを確認）のみに依存している。

**評価**: `design.md` D1 の決定に基づく意図的設計。`userRepository.findById` は `AND organizationId = ?` を WHERE に含んでおり（実装確認済み）、通常のアプリケーション操作でクロスオーグ委譲が作成されることはない。直接 DB 操作や将来のマイグレーションスクリプトのバグによる回避リスクは残るが、実用上許容範囲内と判断する。

---

## Invariant Checklist

| 不変条件 | 実装状況 | 評価 |
|----------|----------|------|
| テナント分離: `findActiveByToUserId` が `organizationId` でスコープ | ✓ 実装済み | OK |
| テナント分離: `deactivateDelegation.update` が `organizationId` でスコープ | ✓ 実装済み | OK |
| テナント分離: Action 層が `organizationId` をセッションから取得（ユーザー入力不可） | ✓ 実装済み | OK |
| クロスオーグ委譲禁止: usecase 層で両ユーザーの組織確認 | ✓ 実装済み | OK |
| 自己委譲禁止: `fromUserId === toUserId` チェック | ✓ 実装済み | OK |
| 期間重複禁止: `findOverlapping` 呼び出し（TX 外、管理者操作限定） | ✓ 実装済み | OK |
| TOCTOU 防止: TX 内で `findActiveByToUserId` を再実行 | ✓ 実装済み | OK |
| 代理承認監査ログ: TX 内で `delegatedFrom` を metadata に記録 | ✓ 実装済み | OK |
| 通常承認時に `delegatedFrom` を記録しない | ✓ 実装済み（`txCheck.delegation` の nil チェック） | OK |
| 委譲作成の監査ログ完全性（TX 内記録） | △ TX 外 | **F-01** |
| 委譲無効化の監査ログ完全性（TX 内記録） | △ TX 外 | **F-02** |
| Admin ロール限定: Action 層・Page 層でチェック | ✓ 実装済み | OK |
| `canApprove` の後方互換性（optional 引数追加） | ✓ 実装済み | OK |
| 承認チェーン（代理の代理）の構造的防止 | ✓ `toUserId` 検索により自然に防止 | OK |

---

## Verdict

- **verdict**: needs-fix

F-01・F-02 の監査ログ完全性問題は、承認権限の委譲・剥奪という機密操作の記録欠落リスクを内包しており、本レビューの観点（監査ログの完全性を保証する）に照らして修正対象と判定する。F-03 は小修正（import 削除）。主要なテナント分離・承認ワークフロー不変条件に問題はなく、F-01〜F-03 修正後は approve 可能。
