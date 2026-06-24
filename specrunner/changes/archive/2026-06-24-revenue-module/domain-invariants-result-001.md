# Domain-Invariants Review — revenue-module — iteration 001

**Reviewer**: domain-invariants  
**Purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Audit Log Completeness | `src/application/usecases/setRevenueTarget.ts`, `updateRevenueTarget.ts`, `deleteRevenueTarget.ts` | revenue_target の write usecase 3 件すべてに `auditLogRepository.create` が実装されていない。プロジェクト全体では全 write usecase が `auditLogRepository.create` を呼び出すという invariant が確立している（grep 確認: 40+ ファイル、`createContract`, `createInvoice`, `createDelegation`, `deleteContract` 等）。売上目標は経営上の重要な財務変更であり、この invariant の遵守は必須。さらに、これらの usecase の引数に `actorId: string` が含まれておらず、現状のインターフェースでは誰が操作したかを記録できない設計になっている（`createDelegation` 等は `actorId` をパラメータとして受け取りトランザクション内でログを記録するパターンを採用している）。spec-review の Finding #2 で同様の問題が MEDIUM として指摘されたが、実装に反映されていない。 | 各 usecase の引数に `actorId: string` を追加する（`setRevenueTarget`, `updateRevenueTarget`, `deleteRevenueTarget`）。操作成功後に `createDelegation.ts` と同じパターンで `db.transaction` 内に `auditLogRepository.create` を追加する。action 名は `"revenue_target.create"` / `"revenue_target.update"` / `"revenue_target.delete"`、`targetType: "revenue_target"`、`targetId`（作成時は返却 ID、更新・削除時は引数 `id`）、`organizationId` を記録する。Server Action 側（`src/app/actions/revenue.ts`）は `session.user.id` を `actorId` として usecase に渡す。 |
| 2 | LOW | Audit Log Completeness | `src/app/api/revenue/export/route.ts` | CSV エクスポートの実行が監査ログに記録されない。既存の `exportAuditLog`（`organization.exportAuditLog`）と同様に、財務データの外部出力は追跡が望ましい。ただし既存の `/api/audit-logs/export` も監査ログ記録を持たないため、プロジェクト全体の read 系 invariant が未確立の現状では MEDIUM 未満と判断する。 | 任意対応: export route の認可チェック通過後に `auditLogRepository.create({ action: "revenue.export", targetType: "revenue", targetId: organizationId, actorId: session.user.id, organizationId, metadata: { axis, startDate, endDate } })` を追加することを推奨する。必須ではないため即時修正対象から除外する。 |

## 詳細検証結果

### テナント分離（PASS）

全クエリ・操作が `organizationId` によってスコープされていることを確認した。

| コンポーネント | テナント分離の実装 | 判定 |
|---|---|---|
| `revenueRepository.getMonthlyRevenue` | `eq(invoices.organizationId, organizationId)` | ✅ |
| `revenueRepository.getCustomerRevenue` | `eq(invoices.organizationId, organizationId)` | ✅ |
| `revenueRepository.getDealRevenue` | `eq(invoices.organizationId, organizationId)` | ✅ |
| `revenueRepository.getPipelineSummary` | `eq(deals.organizationId, organizationId)` | ✅ |
| `revenueTargetRepository` 全関数 | `eq(revenueTargets.organizationId, organizationId)` を全操作に適用 | ✅ |
| Server Actions（revenue.ts） | `session.user.organizationId` を使用し、クエリパラメータから受け取らない | ✅ |
| CSV export route | `session.user.organizationId` を使用し、リクエストパラメータに `organizationId` を受け付けない | ✅ |
| usecase 全体 | `organizationId` を引数として受け取り repository に引き渡す | ✅ |

Cross-tenant アクセスの経路はない。

### 承認ワークフロー不変条件（PASS）

`src/domain/authorization.ts` の `PERMISSION_MATRIX` において、既存のエンティティ（`inquiry`, `deal`, `meeting`, `client`, `contract`, `invoice`, `approval`, `approvalSettings`, `organization`）のエントリは一切変更されていない。新規追加の `revenue` エンティティは独立したエントリとして末尾に追加されており、既存エントリを上書き・変更していない。承認ワークフロー（`approval`, `approvalSettings`）の権限定義は完全に保持されている。

### revenue エンティティ認可マトリクス（PASS）

| 操作 | 許可ロール | 実装 | 判定 |
|---|---|---|---|
| `view` | ALL_ROLES | `PERMISSION_MATRIX.revenue.view = ALL_ROLES` | ✅ |
| `setTarget` | admin, manager | `PERMISSION_MATRIX.revenue.setTarget = ADMIN_MANAGER` | ✅ |
| `export` | admin, manager, finance | `PERMISSION_MATRIX.revenue.export = ADMIN_MANAGER_FINANCE` | ✅ |

Server Action (`setRevenueTargetAction`, `updateRevenueTargetAction`, `deleteRevenueTargetAction`) はいずれも `canPerform(role, "revenue", "setTarget")` でガードされている。CSV export route は `canPerform(role, "revenue", "export")` でガードされている。テストコード（`revenueAuthorization.test.ts`）が全パターンを検証している。

### 期間不変条件（PASS）

`findOverlapping` の重複検出ロジック `period_end > startDate AND period_start < endDate`（Drizzle: `gt(revenueTargets.periodEnd, periodStart)` AND `lt(revenueTargets.periodStart, periodEnd)`）は正しい Allen's interval algebra の重複条件を実装している。`setRevenueTarget` / `updateRevenueTarget` の両 usecase で `periodStart >= periodEnd` バリデーションと重複チェックが実施されている。`excludeId` による自己除外も `updateRevenueTarget` で正しく実装されている。

### 監査ログ不変条件（FAIL — Finding #1）

プロジェクト全体の write usecase における `auditLogRepository.create` の適用状況を確認した。

| usecase | 監査ログ | 備考 |
|---|---|---|
| `createContract`, `deleteContract` | ✅ | 既存 |
| `createInvoice`, `updateInvoiceStatus` | ✅ | 既存 |
| `createDelegation`, `deactivateDelegation` | ✅ | 既存 |
| `createDeal`, `updateDeal`, `deleteDeal`, `updateDealPhase` | ✅ | 既存 |
| `setRevenueTarget` | ❌ | 今回追加 — 欠落 |
| `updateRevenueTarget` | ❌ | 今回追加 — 欠落 |
| `deleteRevenueTarget` | ❌ | 今回追加 — 欠落 |

actorId パラメータの比較:

- `createDelegation`: `actorId: string` を引数に含む ✅
- `setRevenueTarget`: `{ organizationId, periodStart, periodEnd, targetAmount }` — `actorId` なし ❌
- `updateRevenueTarget`: `{ id, organizationId, periodStart?, periodEnd?, targetAmount? }` — `actorId` なし ❌
- `deleteRevenueTarget`: `{ id, organizationId }` — `actorId` なし ❌

インターフェース修正なしに監査ログを追加することはできない。

## 総括

テナント分離・承認ワークフロー不変条件・認可マトリクス・期間不変条件はすべて適切に実装されており、問題はない。唯一の重大な違反は revenue_target write 操作における監査ログの欠落である。これはプロジェクト全体の確立された invariant（全 write usecase が `auditLogRepository.create` を呼び出す）への違反であり、財務上重要な変更（売上目標の設定・変更・削除）の操作者・操作日時・内容が記録されない状態となっている。spec-review で MEDIUM として指摘されたが実装に反映されなかった。usecase インターフェースの `actorId` 追加と `auditLogRepository.create` の追加が必要。
