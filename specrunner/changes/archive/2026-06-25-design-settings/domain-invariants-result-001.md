# Domain Invariants Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    invariants are intact, no cross-tenant leakage, audit completeness confirmed
  - needs-fix:   one or more invariants are violated or at risk
  - escalation:  unresolvable ambiguity or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: tenant data leakage, audit data loss, approval bypass
  - HIGH:     invariant violation, clear security gap, no workaround
  - MEDIUM:   latent risk, edge-case violation, future hazard
  - LOW:      informational, defense-in-depth suggestion
-->

- **verdict**: approved

## Review Scope

| 観点 | 検証対象 |
|------|---------|
| テナント分離 | auditLogRepository, webhookDeliveryRepository, CSV export API |
| 監査ログ完全性 | auditLogRepository.create の書き込みパス、metadata 欠落リスク |
| 承認ワークフロー不変条件 | delegation 分割表示、policy/template カラム変更の影響 |

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | tenant-isolation | src/infrastructure/repositories/auditLogRepository.ts | `findByOrganization` に追加された `actorId`/`targetType` フィルタは常に `eq(auditLogs.organizationId, organizationId)` と `and()` で結合されており、テナント分離は維持されている。ただし、UI の操作者フィルタ option は `listOrganizationUsers` で組織内ユーザーに限定されているが、searchParams に他テナントの任意 UUID を直接入力された場合でも、organizationId フィルタが先に機能するため情報漏洩は起きない。現時点で実害はないが、明示的な whitelist 検証（`actorId` が `orgUsers` 内に存在すること）を page 層で行うと defense-in-depth として望ましい | page 層で `orgUsers.some(u => u.id === actorIdStr)` を確認してから repository に渡す。実装必須ではない |
| 2 | LOW | audit-completeness | src/app/(dashboard)/settings/audit-logs/page.tsx | 監査ログテーブルから「メタデータ」カラムを削除（T-09）しているが、DB への書き込みパス（`auditLogRepository.create`）は変更なし。`metadata` フィールドはDBに保持され続け、CSV エクスポートにも `metadata` カラムが含まれている。表示削減は監査完全性を損なわない | 対応不要 |
| 3 | LOW | tenant-isolation | src/infrastructure/repositories/webhookDeliveryRepository.ts | `findLatestByEndpointIds` は `innerJoin(webhookEndpoints, eq(webhookEndpoints.organizationId, organizationId))` でテナントスコープを強制しており、他テナントの delivery が返ることはない。`inArray(webhookDeliveries.endpointId, endpointIds)` の `endpointIds` 自体も `webhookEndpointRepository.findByOrganization` 経由で組織スコープ済みのため二重に保護されている | 対応不要 |

## Invariant Checklist

### テナント分離

| チェック項目 | 結果 | 根拠 |
|-------------|------|------|
| `auditLogRepository.findByOrganization` が organizationId を常にフィルタ条件の先頭に含む | ✅ | `conditions` 配列の最初の要素が `eq(auditLogs.organizationId, organizationId)` であり、他フィルタ追加後も `and(...conditions)` で結合される |
| CSV エクスポート API が organizationId を session から取得し、クエリパラメータから受け取らない | ✅ | `route.ts` L67: `session.user.organizationId` を直接使用。`actorId`/`targetType` のみ searchParams から取得し、organizationId は常にセッション由来 |
| `findLatestByEndpointIds` が他テナントの delivery を返さない | ✅ | `innerJoin(webhookEndpoints, eq(webhookEndpoints.organizationId, organizationId))` がクロステナントアクセスを防止 |
| 委任ページの「自分の委任」フィルタが session.user.id を使用し、searchParams を使用しない | ✅ | `delegations.filter(d => d.fromUserId === session.user?.id)` — サーバーサイドで session 由来の ID のみ使用 |

### 監査ログ完全性

| チェック項目 | 結果 | 根拠 |
|-------------|------|------|
| `auditLogRepository.create` の書き込みパスが変更されていない | ✅ | 本変更で `create` 関数に変更なし。ビジネスロジック層からの全ての監査ログ書き込みは継続して記録される |
| 監査ログの `metadata` が DB に保持される | ✅ | 表示カラムから削除されたが DB スキーマ・write path は変更なし。CSV エクスポートでも引き続き出力される |
| `actorId` フィルタが監査ログの欠落を引き起こさない | ✅ | フィルタは read-only 操作。write 操作には影響しない |

### 承認ワークフロー不変条件

| チェック項目 | 結果 | 根拠 |
|-------------|------|------|
| 承認ポリシーのビジネスロジックが変更されていない | ✅ | `policies/page.tsx` はカラムヘッダーのリネームのみ（「状態」→「有効/無効」）。ポリシー評価ロジックは無変更 |
| テンプレート一覧のカラム削減がワークフロー動作に影響しない | ✅ | 「フィールド数」カラムの削除は表示のみ。テンプレートデータ取得・適用ロジックは変更なし |
| 委任（delegation）の有効化・無効化ロジックが変更されていない | ✅ | 委任ページは表示の 2 セクション化のみ。`deactivateDelegationAction` の呼び出しパターンは変更なし |
| Webhook endpoint の `secret` が一覧で完全露出しない | ✅ | `listWebhookEndpointsAction` で `ep.secret.slice(0, 8) + "..."` としてマスク済み（既存の動作を維持） |

## 総評

変更の主目的は UI レイアウトの調整であり、ドメイン不変条件に関わる変更は以下の 2 点のみ:

1. **`auditLogRepository.findByOrganization` へのフィルタ追加** — `actorId`/`targetType` を WHERE 条件に追加したが、`organizationId` のフィルタは `conditions` 配列の先頭で常に保持されており、テナント分離は維持されている。

2. **`webhookDeliveryRepository.findLatestByEndpointIds` の新規追加** — `innerJoin` による組織スコープが正しく実装されており、クロステナントアクセスのリスクはない。

監査ログの書き込みパスは変更なし。承認ワークフローに関わるビジネスロジックへの変更はなく、不変条件の破壊は確認されなかった。
