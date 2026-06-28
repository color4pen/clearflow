# Domain-Invariants Review — organization-settings — iteration 001

- **verdict**: approved
- **iteration**: 001
- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | info | tenant-isolation | `src/infrastructure/repositories/organizationRepository.ts` | `update` の WHERE 条件が `eq(organizations.id, id) AND eq(organizations.id, organizationId)` と両方 `organizations.id` との比較。`organizations` テーブルに `organizationId` FK カラムは存在しないため、事実上 `WHERE id = organizationId` のみが効いている。usecase が常に `update(organizationId, organizationId, ...)` と呼ぶため機能的には正しいが、多層防御の「organizationId カラムで絞る」という設計意図とは異なる構造。既存の `findById` と同パターンのため後退ではない | 組織テーブルはそれ自体が root entity であるため、今後の開発者向けに `// organizations は root entity。id === organizationId が不変。二重条件は既存 findById との一貫性維持` 等のコメントを追加する | no |
| 2 | info | audit-completeness | `src/application/usecases/updateOrganization.ts` | 監査ログの `metadata` に `{ name: data.name }` (更新後の名称) のみ記録されており、更新前の名称が残らない。spec 要件（`metadata: { name: "新社名" }`）は満たしているが、変更前後の差分を audit trail から追跡できない | 将来的には `metadata: { previousName: <旧名>, name: <新名> }` 形式への拡張を検討する（current spec に反しないよう別リクエストで対応） | no |
| 3 | info | defense-in-depth | `src/app/actions/organization.ts` | `getOrganizationAction` が `auth()` のみで `canPerform` チェックなし。`page.tsx` と settings layout の admin ガードが前提となっており、Server Action 単体での認可境界が不完全。`organization.name` は高感度情報ではないため実害は低い | `canPerform(session.user.role, "organization", "listUsers")` 相当のガードを追加し、Action 単体で自己完結した認可境界にする | no |

---

## Invariant Verification

### I-1: テナント分離 — 自組織のみ更新可能

**判定: ✅ 保証されている**

更新パスを上から下に追う:

1. **Server Action** (`updateOrganizationAction`): `organizationId = session.user.organizationId` — セッション由来、`formData` から受け取らない。静的コード解析テスト（`organizationSettingsActions.test.ts`）でこの制約が固定されている。
2. **Usecase** (`updateOrganization`): `organizationId` をそのまま repository と recordAudit に渡す。外から受け取ったものを素通しするだけで改変なし。
3. **Repository** (`organizationRepository.update`): `WHERE organizations.id = $organizationId`（両引数が同値のため実効条件は1つ）。

セッションの `organizationId` は Auth.js が発行し、クライアントが書き換えられない。この鎖で「自組織以外の名称を書き換えることは不可能」という不変条件が成立する。

### I-2: 監査ログの原子性 — 更新と記録の同時成立

**判定: ✅ 保証されている**

`updateOrganization.ts` の `db.transaction` ブロック内で:

1. `organizationRepository.update(...)` に `tx` を渡す
2. `recordAudit(...)` に同じ `tx` を渡す

どちらかが例外を投げれば `db.transaction` がロールバックする。更新成功・監査記録失敗、またはその逆のハーフコミット状態は発生しない。`recordAudit` は `auditLogRepository.create` に `tx` を伝搬するため、最終 SQL 発行レベルまで同一トランザクションが貫通している。

### I-3: 監査ログの完全性 — 必須フィールドの網羅

**判定: ✅ 仕様要件を満たしている**

記録されるフィールド:

| フィールド | 値 | 評価 |
|-----------|-----|------|
| `action` | `"organization.update"` | ✅ spec 通り |
| `targetType` | `"organization"` | ✅ spec 通り |
| `targetId` | `data.organizationId` (セッション由来) | ✅ 正しい対象 |
| `actorId` | `data.actorId` = `session.user.id` | ✅ 改ざん不能 |
| `organizationId` | `data.organizationId` (セッション由来) | ✅ テナント紐付け |
| `metadata.name` | 更新後の組織名 | ✅ spec 通り（Finding #2 参照: 更新前名称の欠如は info 留め） |

`AuditTargetType` に `"organization"` が追加され、`AuditAction` に `"organization.update"` が追加されているため、型レベルでの整合性も保証されている。

### I-4: 承認ワークフロー不変条件 — 既存不変条件の非破壊

**判定: ✅ 既存の不変条件は一切破壊されていない**

変更は純粋に加法的:

- `AuditAction`: union 型への追加。既存メンバー（`request.approve` / `request.reject` / `approval_step.*` 等）は変更なし
- `AuditTargetType`: union 型への追加。既存メンバー変更なし
- `PERMISSION_MATRIX.organization`: `updateOrganization: ADMIN_ONLY` を追加。既存操作（`listUsers` / `viewAuditLog` / `changeRole` / `createUser` / `exportAuditLog` / `manageWebhooks`）の権限変更なし
- 承認フロー（`approval` / `approvalSettings` エンティティ）に触れた変更はゼロ

全 1310 テスト pass（verification-result.md 確認済み）。既存の承認ワークフロー関連テストに回帰なし。

### I-5: 認可境界 — ADMIN_ONLY の徹底

**判定: ✅ 更新経路で徹底されている（読み取り経路は info 留め）**

`updateOrganizationAction` では:
- `auth()` → 未認証の場合は早期 return
- `canPerform(session.user.role, "organization", "updateOrganization")` → admin 以外は早期 return
- authorization.ts `ADMIN_ONLY = ["admin"]` と組み合わせ、manager / finance / member はすべて拒否

`page.tsx` でも `session.user.role !== "admin"` で `/requests` にリダイレクトする二重防御が存在する。

`getOrganizationAction`（読み取り）は `canPerform` なし（Finding #3）。ただし organizationId はセッション由来のため、認証済みユーザーが自組織名を読める状態は情報漏洩とは言えない。

---

## Summary

テナント分離・監査ログ原子性・監査ログ完全性・承認ワークフロー不変条件のすべてが設計通りに実装されており、domain-invariants の観点からは承認可能な状態にある。

3 件の所見はいずれも info 留めであり、Fix 列はすべて `no`（不変条件の破壊ではなく将来の改善提案）。
