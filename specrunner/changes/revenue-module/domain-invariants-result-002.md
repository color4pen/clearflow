# Domain-Invariants Review — revenue-module — iteration 002

**Reviewer**: domain-invariants  
**Purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Audit Log Completeness | `src/application/usecases/updateRevenueTarget.ts`, `deleteRevenueTarget.ts` | `updateRevenueTarget` および `deleteRevenueTarget` の `auditLogRepository.create` に `metadata` が含まれていない。`setRevenueTarget` では `{ periodStart, periodEnd, targetAmount }` を metadata として記録しているが、update/delete にはそれがない。財務上の変更記録として「何が変わったか」「削除前の値は何だったか」がログから読み取れない。ただし「誰が・いつ・どのエンティティを操作したか」は記録されており、audit log の core invariant は満たしている。 | `updateRevenueTarget` では `metadata: { changes: { periodStart, periodEnd, targetAmount } }` を記録する（変更フィールドのみ）。`deleteRevenueTarget` では削除前に `findById` で取得済みの `existing` の値を `metadata: { deletedTarget: { periodStart, periodEnd, targetAmount } }` として記録する。必須ではないが財務監査の観点から推奨。 |
| 2 | LOW | Audit Log Completeness | `src/app/api/revenue/export/route.ts` | iteration 001 からの継続: CSV エクスポートが監査ログに記録されない。引き続き任意対応。プロジェクト全体の read 系 invariant が未確立の現状では優先度は低い。 | 任意対応（iteration 001 Finding #2 に同じ）。 |

## 詳細検証結果

### テナント分離（PASS）

iteration 001 から変更なし。全クエリ・操作が `organizationId` によってスコープされていることを再確認した。

| コンポーネント | テナント分離の実装 | 判定 |
|---|---|---|
| `revenueRepository` 全関数 | `eq(invoices.organizationId, organizationId)` / `eq(deals.organizationId, organizationId)` | ✅ |
| `revenueTargetRepository` 全関数 | `eq(revenueTargets.organizationId, organizationId)` を全操作に適用 | ✅ |
| Server Actions（revenue.ts） | `session.user.organizationId` を使用、クエリパラメータから受け取らない | ✅ |
| CSV export route | `session.user.organizationId` を使用、リクエストパラメータに `organizationId` を受け付けない | ✅ |
| usecase 全体 | `organizationId` を引数として受け取り repository に引き渡す | ✅ |

Cross-tenant アクセスの経路はない。

### 承認ワークフロー不変条件（PASS）

`src/domain/authorization.ts` の `PERMISSION_MATRIX` において、既存エンティティ（`inquiry`, `deal`, `meeting`, `client`, `contract`, `invoice`, `approval`, `approvalSettings`, `organization`）のエントリは iteration 001 から一切変更されていない。承認ワークフロー（`approval`, `approvalSettings`）の権限定義は完全に保持されている。

### 監査ログ不変条件（PASS ← iteration 001 FAIL からの改善）

iteration 001 の Finding #1（HIGH）で指摘した、revenue_target write usecase 3 件すべてにおける `auditLogRepository.create` の欠落と `actorId` 引数の欠如が修正された。

| usecase | actorId | auditLogRepository.create | action 名 | metadata | 判定 |
|---|---|---|---|---|---|
| `setRevenueTarget` | `actorId: string` ✅ | `db.transaction` 内で呼び出し ✅ | `"revenue_target.create"` ✅ | `{ periodStart, periodEnd, targetAmount }` ✅ | ✅ |
| `updateRevenueTarget` | `actorId: string` ✅ | `db.transaction` 内で呼び出し ✅ | `"revenue_target.update"` ✅ | なし ⚠️ | ✅ (core OK) |
| `deleteRevenueTarget` | `actorId: string` ✅ | `db.transaction` 内で呼び出し ✅ | `"revenue_target.delete"` ✅ | なし ⚠️ | ✅ (core OK) |

Server Action 側（`revenue.ts`）での `actorId` 受け渡しを確認した。

| Server Action | actorId 渡し方 | 判定 |
|---|---|---|
| `setRevenueTargetAction` | `actorId: session.user.id` ✅ | ✅ |
| `updateRevenueTargetAction` | `actorId: session.user.id` ✅ | ✅ |
| `deleteRevenueTargetAction` | `actorId: session.user.id` ✅ | ✅ |

「誰が・いつ・どのエンティティを操作したか（actorId, organizationId, targetId, action）」の core invariant は満たしている。「何を変更したか」の metadata が update/delete で欠落しているのは LOW の改善余地（Finding #1）。

### 認可マトリクス（PASS）

iteration 001 から変更なし。

| 操作 | 許可ロール | 実装 | 判定 |
|---|---|---|---|
| `view` | ALL_ROLES | `PERMISSION_MATRIX.revenue.view = ALL_ROLES` | ✅ |
| `setTarget` | admin, manager | `PERMISSION_MATRIX.revenue.setTarget = ADMIN_MANAGER` | ✅ |
| `export` | admin, manager, finance | `PERMISSION_MATRIX.revenue.export = ADMIN_MANAGER_FINANCE` | ✅ |

Server Action の認可チェック（`canPerform(role, "revenue", "setTarget")`）、CSV export route の認可チェック（`canPerform(role, "revenue", "export")`）はすべて正しく実装されている。

### 期間不変条件（PASS）

iteration 001 から変更なし。`findOverlapping` の重複検出ロジック（Allen's interval algebra）、`setRevenueTarget` / `updateRevenueTarget` の両 usecase での `periodStart >= periodEnd` バリデーションと重複チェック、`excludeId` による自己除外はすべて正しく実装されている。

### iteration 001 Finding #1（HIGH）の解消確認

```typescript
// setRevenueTarget — BEFORE（iteration 001）
export async function setRevenueTarget(data: {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  targetAmount: number;
  // actorId なし ❌
})

// setRevenueTarget — AFTER（iteration 002）
export async function setRevenueTarget(data: {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  targetAmount: number;
  actorId: string;  // 追加 ✅
})
// db.transaction 内で auditLogRepository.create を呼び出し ✅
```

同様に `updateRevenueTarget` と `deleteRevenueTarget` も `actorId: string` 追加と `auditLogRepository.create` 呼び出しが確認できた。

## 総括

iteration 001 で指摘した唯一の HIGH 違反（revenue_target write usecase における監査ログの欠落）が完全に修正された。3 つの write usecase すべてに `actorId` 引数が追加され、`db.transaction` 内で `auditLogRepository.create` が呼び出されるようになった。Server Action から `session.user.id` を `actorId` として渡す実装も正しい。

残存する問題は 2 件とも LOW であり、audit log の core invariant（誰が・いつ・どのエンティティを変更したか）は満たされている。`updateRevenueTarget` / `deleteRevenueTarget` の metadata 欠落は財務監査品質の向上として推奨するが、invariant 違反ではない。

テナント分離・承認ワークフロー不変条件・認可マトリクス・期間不変条件はすべて PASS のまま維持されている。domain-invariants の観点でこの変更は承認可能と判断する。
