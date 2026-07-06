# Review: domain-invariants — oauth-authorization-server — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 観点と判定

### 1. `inv-audit-log-append-only` — 監査ログは追記専用

**判定: ✅ 準拠**

- `recordAudit` は `auditLogRepository.create` のみを呼ぶ。update/delete は一切行われていない。
- `oauth_connection.create`（同意時）と `oauth_connection.revoke`（接続解除時）の両方が、`recordAudit` を通じてトランザクション内に同期記録される。
- `targetId` には `clientId`（UUIDまたは登録クライアントID）が入り、トークン平文・ハッシュ・認可コードはメタデータ・targetId のいずれにも含まれていない。要件 7 の「トークン値・コードはメタデータに含めない」が守られている。
- 監査ログには `organizationId` が付与されており、テナント分離も維持されている。

**補足（advisory）**: `revokeOAuthConnection` は `revokeByUserAndClientId` が 0 行更新（対象トークン存在せず）の場合でも `recordAudit` を呼ぶ。接続実態のない revoke を監査ログに記録するという意味上の余剰は存在するが、追記専用の不変条件自体は破壊していない。要件定義でも "no-op 解除は記録しない" という要求はない。

---

### 2. `inv-all-tenant-scoped` — 全操作はテナント分離される

**判定: ✅ 準拠（例外は明示・文書化済み）**

**`oauth_tokens` テーブル側（テナントスコープ）**:
- `userId` + `organizationId` の複合 FK 付き。接続一覧・解除・lastUsedAt 更新のすべてがこの 2 カラムでスコープされている。
- `findActiveConnectionsByUser(userId, organizationId)` — WHERE 句に `userId` と `organizationId` の両方を含む ✅
- `revokeByUserAndClientId(userId, clientId, organizationId, tx?)` — WHERE 句に `userId`, `clientId`, `organizationId` を含む ✅
- `updateLastUsedAt(id, organizationId, timestamp)` — WHERE 句に `organizationId` を含む ✅
- `findByTokenHash` はグローバル検索（組織未知状態での Bearer 検証は PAT と同パターン）。取得後の `organizationId` はトークンレコード由来で、その後の処理はテナントスコープされる ✅

**`oauth_clients` テーブル側（プラットフォームスコープ、意図的例外）**:
- `organizationId` を持たないことが `design/domain/invariants.md`（`#inv-oauth-client-platform-scoped`）および `design/domain/model.md` に明示文書化されている ✅
- テナント機密データはクライアントレコードに含まれない（名称・リダイレクトURIのみ）。テナント分離の責務は `oauth_tokens`（同意レコード）が担保 ✅

**`revokeByFamilyId` の非スコープ設計**:
- `organizationId` でスコープしていないが、これは意図的な設計（系列一括失効 = セキュリティ緊急応答）。
- familyId は認可コード発行時に新規 UUID として生成され、同一フロー由来のトークン群のみが同じ familyId を持つ。全トークンが同一 userId + organizationId で作成されるため、クロステナントリスクはゼロ。

---

### 3. `inv-oauth-client-platform-scoped` — 新規不変条件の整合性

**判定: ✅ 実装・文書両面で整合**

- `design/domain/invariants.md` に `#inv-oauth-client-platform-scoped` セクションとして追記されている。
- `design/domain/model.md` に `OAuth クライアント {#ent-oauth-client}` エンティティが追加され、"組織に属さないプラットフォームレベルの記録"と明記されている。
- `src/infrastructure/schema.ts` の `oauthClients` テーブルに `organizationId` カラムは存在しない。
- Server Actions（`revokeOAuthConnectionAction`, `listOAuthConnectionsAction`）は `organizationId` を Auth.js セッションから取得し、URL パラメータからの注入は不可。

---

### 4. 承認ワークフロー不変条件群 — 破壊がないことの確認

**判定: ✅ 既存不変条件への影響なし**

変更ファイルのうち既存コードに触れたもの:
- `src/domain/models/auditLog.ts` — `AuditAction` と `AuditTargetType` に新値を追加しただけ（型の拡張）。既存値への変更・削除なし。
- `src/infrastructure/apiTokenResolver.ts` — PAT 解決パスはそのまま保持。`hasApiTokenPrefix` 関数名も維持。OAuth パスを新規分岐として追加。
- `src/app/api/mcp/route.ts` — 401 レスポンスに `WWW-Authenticate` ヘッダを追加しただけ。認証ロジック・承認フロー呼び出しに変更なし。

以下の不変条件について、関連コードに変更がないことを確認した:
- `inv-approval-evaluate-all-policies`
- `inv-system-approval-blocks-action`
- `inv-post-approval-same-tx`
- `inv-approval-steps-sequential`
- `inv-approver-role-or-id`
- `inv-audit-log-append-only`（既存アクション類への影響なし）

---

### 5. テスト網羅性（不変条件観点）

**テナント分離のカバレッジ**:
- `oauthConnections.test.ts`: USER_A と USER_B の接続分離（同一組織内）、解除の他ユーザー非影響をテスト ✅
- `oauthBearerMcp.test.ts`: 失効済み・期限切れトークンの MCP 401 をテスト ✅

**advisory — クロス組織テストの欠如**:
- `oauthConnections.test.ts` の全テストが同一 `ORG="org-1"` で実行されており、異なる組織間の分離（例: org-1 ユーザーが org-2 ユーザーのトークンを解除できないこと）を直接テストするケースがない。
- ただし、コード実装では `revokeByUserAndClientId` と `findActiveConnectionsByUser` の両方が `organizationId` で正しくスコープされており、実装上の欠陥はない。テストカバレッジの強化余地として記録する。

---

## サマリー

| 不変条件 | 判定 |
|---|---|
| inv-audit-log-append-only | ✅ 準拠 |
| inv-all-tenant-scoped（oauth_tokens） | ✅ 準拠 |
| inv-oauth-client-platform-scoped（新規例外） | ✅ 文書化・実装済み |
| 承認ワークフロー不変条件群 | ✅ 影響なし |

実装・設計ドキュメントともに domain invariants の観点から問題なし。
