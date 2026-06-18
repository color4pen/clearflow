# Domain Invariants Review Result — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants intact, no tenant isolation or audit log violations
  - needs-fix:   one or more invariants broken or at critical risk
  - escalation:  unresolvable conflict or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: invariant broken in production — data corruption, tenant leak, audit gap on committed operations
  - HIGH:     invariant breakage under realistic conditions — blocks approval
  - MEDIUM:   latent risk to invariant, not exploitable in current architecture
  - LOW:      informational, future risk, minor concern
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | テナント分離 / 将来リスク | `src/infrastructure/schema.ts`, `src/infrastructure/rateLimit.ts` | `rate_limit_records` テーブルは `organizationId` を持たず、key は `{category}:{userId}` 形式。現行アーキテクチャでは 1 ユーザー = 1 テナントであり（`users.organizationId` が NOT NULL で 1 対 1 紐付け）、ユーザー UUID が固有であるため現時点でテナント間干渉は不可能。ただし、将来マルチテナント所属ユーザーが導入された場合、key 設計の変更なしにレート制限がテナント境界をまたぐ可能性がある。 | 現スコープでは対応不要。将来マルチテナント所属を検討する際は key を `{category}:{organizationId}:{userId}` に変更するか、`rate_limit_records` に `organizationId` カラムを追加する。 |
| 2 | LOW | 監査ログ / 可観測性 | `src/app/actions/requests.ts`, `src/app/actions/webhooks.ts` | レート制限超過（早期リターン）のイベントが監査ログに記録されない。承認 / 却下などのビジネス操作は usecase 内のトランザクションで監査ログを記録しており完全性は保たれているが、誰がいつレート制限に到達したかは現実装では追跡不可能。セキュリティ監査・不正利用調査において可視性が低い。 | 現スコープでは許容。将来の要件として、`checkRateLimit` が `allowed: false` を返した際に `auditLogs` へ `"rate_limit.exceeded"` イベントを記録する機能を別 request で検討する。 |

## Review Summary

### 検証対象

- テナント分離: `rate_limit_records` スキーマ設計、key 生成ロジック、既存ビジネスエンティティ操作のスコープ
- 監査ログ完全性: 承認 / 却下操作が成功した場合の監査ログ記録、レート超過時の早期リターンと監査ログの関係
- 承認ワークフロー不変条件: ロール検証の順序、状態遷移ルール、楽観的ロック（version）、冪等性保証

### テナント分離

**問題なし（現行アーキテクチャ）。**

`rate_limit_records` テーブルはテナントスコープを持たない設計だが、これは意図的（design.md D1 記載）。`users.organizationId` が NOT NULL 制約付き FK であり、1 ユーザーが複数テナントに属することは不可能なため、UUID ベースの key で十分なテナント間干渉防止が実現できている。

既存ビジネスエンティティ操作については以下を確認した:

- `approveRequest` / `rejectRequest` / `submitRequest` / `resubmitRequest`: usecase に `organizationId: session.user.organizationId` を渡し、repository 内で `requestId + organizationId` の複合条件で検索。他テナントのリクエストへのアクセスは "not found" で阻止される。
- `webhooks.ts` の全書き込み操作: `session.user.organizationId` で絞り込み済み。`deleteWebhookEndpointAction`・`retryWebhookDeliveryAction` は deliveryId / endpointId を取得する際にも `organizationId` で検証。
- `idempotencyKeys` テーブルの UNIQUE 制約は `(key, organizationId)` の複合制約であり、テナント A の冪等キーがテナント B の idempotency 保証を妨害できない設計も維持されている。

### 監査ログの完全性

**ビジネス操作の記録は完全に維持されている。**

承認 / 却下操作が実際に実行された場合、`approveRequest` / `rejectRequest` usecase はトランザクション内で `auditLogRepository.create()` を呼び出す（例: `"request.approve"`, `"approval_step.approve"`, `"request.reject"` 等）。これらはレート制限チェックとは独立した usecase 内のロジックであり、本変更による影響は皆無。

レート制限超過時は usecase が呼ばれずに早期リターンするため、実行されていない操作に対する監査ログが欠落することはない（正しい動作）。

軽微な懸念としてレート超過イベント自体の監査ログ欠如を記録したが（Finding #2）、これは「不変条件の破壊」ではなく「新機能の欠如」であり、現スコープ外。

### 承認ワークフロー不変条件

**すべての不変条件が維持されていることを確認した。**

1. **ロール検証の順序**: `approveRequestAction` / `rejectRequestAction` は `session.user.role === "member"` チェックをレート制限の**前**に実行。権限のないユーザーはレートカウントを消費できない。

2. **状態遷移ルール**: `validateTransition` は domain/services で強制される。レート制限はusecase実行の前段でスキップするだけであり、状態遷移ロジック自体には触れない。

3. **楽観的ロック（version）**: `approveRequest` usecase のトランザクション内で `existing.version` をトークンとして使用。並行操作による不正な状態遷移（例: rejected→approved）を防止する TOCTOU 対策はレート制限変更の影響を受けない。

4. **冪等性保証の維持**: 冪等キーチェックはレート制限の**前**に配置されており（仕様通り）、キャッシュヒット時はレートカウントを消費しない。ネットワークリトライ等の正当な再試行がブロックされない設計が正しく実装されている。`submitRequestAction` / `approveRequestAction` / `rejectRequestAction` / `resubmitRequestAction` の 4 Action すべてで確認済み。

5. **依存方向**: `src/application/usecases/` 配下のいずれのファイルも `rateLimit` を import していないことを確認。`actions → infrastructure` の依存方向は維持されている。

CRITICAL / HIGH 相当のドメイン不変条件の違反は確認されなかった。**approved** とする。
