# Domain Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    all domain invariants preserved
  - needs-fix:   one or more invariant violations require correction
  - escalation:  unresolvable ambiguity or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: invariant broken, data corruption or security breach possible
  - HIGH:     invariant at serious risk, functional failure or tenant leakage
  - MEDIUM:   invariant weakened, future risk or maintainability issue
  - LOW:      informational, minor gap, style
-->

- **verdict**: approved

## Review Scope

| 観点 | 確認内容 |
|------|---------|
| テナント分離 | 全 Webhook クエリに organizationId 条件が付与されているか |
| 監査ログ完全性 | 既存の auditLog 書き込みがトランザクション内に保持されているか |
| 承認ワークフロー不変条件 | 状態遷移ルール・TOCTOU 保護・トランザクション境界が破壊されていないか |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | テナント分離・内部関数 | `src/infrastructure/repositories/webhookDeliveryRepository.ts:39-57` | `updateStatus` は delivery ID のみで更新し、organizationId 検証を行わない。`webhookDeliveries` テーブルが organizationId カラムを持たず、テナント帰属は `endpointId → webhookEndpoints.organizationId` の間接参照で行われる設計による。現在はこの関数が `deliverToEndpoint` 内部からのみ呼ばれ、deliveryId は同一実行フロー内で生成済みのため外部入力ができず実害なし。将来この関数を再利用する場合に横取りリスクが生じうる。 | 将来の拡張時に `webhookEndpoints` との JOIN で organizationId を検証するか、関数シグネチャに `organizationId` を追加することを検討する（現時点では修正不要）。 |
| 2 | LOW | 監査ログ・情報 | `src/application/usecases/approveRequest.ts`, `rejectRequest.ts` | Webhook 配信失敗時に `console.error` のみでログが記録されるが、Webhook 配信試行の成否は `webhook_deliveries` テーブルに記録される。監査ログ（`audit_logs`）は Webhook 失敗の影響を受けず、承認・却下操作のすべての状態変更が `audit_logs` に確実に記録されることを確認済み。情報として記録する。 | 対応不要。設計上許容された動作。 |

## Invariant Verification Details

### 1. テナント分離

| 対象 | 判定 | 根拠 |
|------|------|------|
| `webhookEndpointRepository.findByOrganization` | ✅ | `eq(webhookEndpoints.organizationId, organizationId)` |
| `webhookEndpointRepository.findActiveByOrganizationAndEvent` | ✅ | `and(eq(...organizationId), eq(...isActive, true))` + JS フィルタ |
| `webhookEndpointRepository.updateIsActive` | ✅ | `and(eq(...id), eq(...organizationId))` |
| `webhookEndpointRepository.deleteById` | ✅ | `and(eq(...id), eq(...organizationId))` |
| `webhookDeliveryRepository.findByEndpointId` | ✅ | 事前に endpoint の organizationId を JOIN 検証してから delivery を取得 |
| `webhookDeliveryRepository.updateStatus` | ⚠️ LOW | ID のみ（内部専用関数、実害なし） |
| Server Actions (webhooks.ts) | ✅ | 全 action で `session.user.organizationId` 使用、formData から organizationId を取得しない |
| admin ロールチェック | ✅ | 全 action で `session.user.role !== "admin"` → エラー返却 |

### 2. 監査ログ完全性

全 5 usecase において `auditLogRepository.create()` が `db.transaction(async (tx) => { ... })` ブロック内に配置されていることを確認。Webhook 配信 (`void deliverWebhookEvent(...)`) はトランザクション完了後にのみ呼び出される。

| usecase | auditLog 書き込み位置 | Webhook 配信位置 |
|---------|---------------------|----------------|
| `createRequest` | トランザクション内 ✅ | トランザクション外 ✅ |
| `submitRequest` | トランザクション内 ✅ | トランザクション外 ✅ |
| `approveRequest` (ステップなし) | トランザクション内 ✅ | トランザクション外 ✅ |
| `approveRequest` (マルチステップ) | トランザクション内 ✅ (step + request 両方) | トランザクション外 ✅ |
| `rejectRequest` (revision) | トランザクション内 ✅ | トランザクション外 ✅ |
| `rejectRequest` (rejected) | トランザクション内 ✅ | トランザクション外 ✅ |
| `resubmitRequest` | トランザクション内 ✅ | トランザクション外 ✅ |

### 3. 承認ワークフロー不変条件

| 不変条件 | 判定 | 根拠 |
|---------|------|------|
| 状態遷移バリデーション (`validateTransition`) | ✅ 破壊なし | 全 usecase で変更前と同様に使用されている |
| ロール認可チェック (`canApprove`) | ✅ 破壊なし | `approveRequest` のトランザクション前チェックが保持されている |
| TOCTOU 保護（トランザクション内再取得） | ✅ 破壊なし | `approveRequest` の `freshSteps` 再取得ロジックが保持されている |
| トランザクション境界 | ✅ 変更なし | 既存の `db.transaction()` ブロックの構造に変更なし |
| fire-and-forget の堅牢性 | ✅ 正確に実装 | `void deliverWebhookEvent()` + outer try-catch。Webhook 失敗がユーザーレスポンスに伝播しない |
| 承認操作失敗時に Webhook 未発火 | ✅ | `deliverWebhookEvent` 呼び出しは `db.transaction()` 成功後、`try` ブロック内の `catch` ジャンプより前にあり、トランザクション失敗時には実行されない |

## 総評

テナント分離・監査ログ完全性・承認ワークフロー不変条件のすべてにおいて、本変更が既存の保証を損なっていないことを確認した。Webhook 配信は完全にトランザクション外に隔離されており、配信の成否が業務フローに影響しない設計が 5 usecase 全てで一貫して実装されている。指摘事項は LOW 2 件のみであり、いずれも設計上許容された範囲内。
