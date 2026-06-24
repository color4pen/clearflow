# Review Result — domain-invariants — approval-policy-schema — iter 1

- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。
- **verdict**: approved

---

## 検証スコープ

1. テナント分離 — 全リポジトリ関数に `organizationId` 条件が適用されているか
2. 監査ログの完全性 — `from_user_role` マイグレーション・audit_log の整合性
3. CHECK 制約によるデータ不変条件の保護
4. FK 制約と参照整合性
5. シードデータの FK 削除順序

---

## テナント分離の検証

### approvalPolicyRepository（新設）

| 関数 | organizationId 条件 | 判定 |
|---|---|---|
| `create` | INSERT に organizationId を含む | ✅ |
| `findById` | `AND eq(organizationId)` | ✅ |
| `findByOrganization` | `WHERE eq(organizationId)` | ✅ |
| `findActiveByTriggerAction` | `AND eq(organizationId) AND eq(isActive, true)` | ✅ |
| `updateById` | `AND eq(organizationId)` | ✅ |
| `deleteById` | `AND eq(organizationId)` | ✅ |

全 6 関数にテナント分離が適用されている。`findActiveByTriggerAction` はポリシー評価の起点となる重要な関数であり、`isActive = true` の条件も正しく組み込まれている。

### approvalDelegationRepository（更新後）

JOIN 削除後も全クエリに `organizationId` 条件が維持されていることを確認した。

| 関数 | organizationId 条件 | 判定 |
|---|---|---|
| `findActiveByToUserId` | `AND eq(organizationId)` | ✅ |
| `findByOrganization` | `WHERE eq(organizationId)` | ✅ |
| `findOverlapping` | `AND eq(organizationId)` | ✅ |
| `create` | INSERT に organizationId を含む | ✅ |
| `update` | `AND eq(organizationId)` | ✅ |

### requestRepository / approvalStepRepository（更新後）

origin カラム追加後も既存のテナント分離条件が全関数で維持されていることを確認した。

---

## 監査ログの完全性

### from_user_role マイグレーションの検証

マイグレーション SQL（`drizzle/0005_black_absorbing_man.sql`）の `from_user_role` 追加が、設計の 3 ステップ戦略どおりに実装されている。

```sql
ALTER TABLE "approval_delegations" ADD COLUMN "from_user_role" text;
UPDATE "approval_delegations" SET "from_user_role" = (SELECT "role" FROM "users" WHERE "users"."id" = "approval_delegations"."from_user_id");
ALTER TABLE "approval_delegations" ALTER COLUMN "from_user_role" SET NOT NULL;
```

- nullable 追加 → UPDATE → NOT NULL 設定の順序が正しい ✅
- `from_user_id` は `users.id` への FK 制約があるため、対応する users 行は必ず存在し UPDATE で NULL が残る危険がない ✅
- roleEnum 値は PostgreSQL が text に暗黙キャストするため UPDATE は正常動作する ✅

### createDelegation usecase との整合

`createDelegation.ts` のトランザクション内で `fromUserRole: fromUser.role` を `approvalDelegationRepository.create()` に渡している。`fromUser` は直前のクロスオーグチェック（step 3）で取得済みのため、余分な SELECT クエリなしにロールを記録できる。audit_log の `delegation.create` も同トランザクション内で作成され、原子性が保証されている。✅

---

## CHECK 制約によるデータ不変条件

### approval_policies_condition_check

```sql
(condition_field IS NULL AND condition_operator IS NULL AND condition_value IS NULL)
OR
(condition_field IS NOT NULL AND condition_operator IS NOT NULL AND condition_value IS NOT NULL)
```

condition の 3 フィールドが「全 NULL または全 NOT NULL」を DB レベルで強制する。スキーマ定義（`schema.ts`）と migration SQL の両方に含まれていることを確認した。✅

### requests_origin_check

```sql
(origin_type = 'manual' AND origin_policy_id IS NULL AND origin_trigger_action IS NULL AND origin_trigger_entity_id IS NULL)
OR
(origin_type = 'system' AND origin_policy_id IS NOT NULL AND origin_trigger_action IS NOT NULL AND origin_trigger_entity_id IS NOT NULL)
```

この CHECK 制約は 2 つの不変条件を同時に保証している：
1. `origin_type` の値域を実質的に `'manual' | 'system'` に制限する（他の値ではいずれの OR 条件も満たせないため CHECK 違反となる）
2. `origin_type = 'system'` のリクエストに必ず policy_id が記録されることを保証する（監査追跡性）

既存行は `DEFAULT 'manual'` で自動的に manual 扱いとなり、後方互換性が保たれる。✅

---

## FK 制約と参照整合性

### origin_policy_id の ON DELETE 設定

`requests.origin_policy_id → approval_policies.id` は `ON DELETE NO ACTION`（= RESTRICT）。`origin_type = 'system'` のリクエストが存在する状態でポリシーを削除しようとすると DB がエラーを返す。`ON DELETE SET NULL` では `requests_origin_check` 違反が発生するため RESTRICT が正しい選択。✅

### approval_steps.approver_id の FK

`approver_id → users.id` に FK 制約があり、存在しないユーザー ID の設定を DB レベルで防止する。✅

---

## シードデータの FK 削除順序

`seed.ts` の truncate 順序を確認した。

```
auditLogs → approvalSteps → dealContacts → invoices → contracts
→ meetings → deals → inquiries → clientContacts → clients
→ requests → approvalPolicies → approvalTemplates
→ accounts → sessions → verificationTokens
→ webhookDeliveries → webhookEndpoints → approvalDelegations
→ users → organizations
```

- `requests`（子）→ `approvalPolicies`（親）の順序で削除しており、FK 制約に適合する ✅
- `fromUserRole: "manager"` が `approvalDelegations` の INSERT に含まれている ✅

---

## 指摘事項

### [info] originType の runtime バリデーション欠如

**対象**: `src/infrastructure/repositories/requestRepository.ts`

```typescript
originType: row.originType as OriginType,
```

`conditionOperator` は `CONDITION_OPERATORS` セットで runtime バリデーションを行っているが、`originType` は unchecked cast のみ。DB の CHECK 制約により有効値以外は挿入できないため実害はない。ただし、将来マイグレーション手動修正や直接 SQL 操作でデータ不整合が生じた場合にアプリケーション層での早期検出ができない。

**修正提案（任意）**: `conditionOperator` と同様に `ORIGIN_TYPES = new Set(["manual", "system"])` でガードを追加することを将来の改善として検討する。

**ブロック要因**: なし（DB 制約で実質保護されている）

### [info] findOverdueRequestIds のクロステナントスキャン（pre-existing）

**対象**: `src/infrastructure/repositories/approvalStepRepository.ts`

`findOverdueRequestIds` は `organizationId` 条件を持たず全テナントをスキャンするが、これは本 PR の変更ではなく既存コード。結果に `organizationId` を含めており、呼び出し元がテナントごとに適切に処理するパターン（cron ジョブ用途）。本 PR の変更による新規リスクではない。

---

## 承認ワークフローの不変条件確認

本変更により既存の承認フローが破壊されていないことを確認した。

- approval_steps に追加された `name`, `approverId` は両方 nullable であり、既存の `approver_role` ベースのロール承認フローには影響しない ✅
- approvalDelegationRepository の JOIN 削除は内部実装変更のみで、型インターフェース（`ApprovalDelegation`）は変更なし ✅
- requestRepository.create の origin 引数はすべて optional で、デフォルト `'manual'` により既存の手動フローは引き続き動作する ✅

---

## 総評

テナント分離・監査ログの完全性・CHECK 制約によるデータ不変条件のいずれも設計仕様どおりに実装されている。マイグレーションの 3 ステップ戦略、FK の RESTRICT 設定、シードの FK 削除順序も正しく、既存の承認フローを破壊していない。指摘事項は実害のない情報レベルのみであり、承認をブロックするものはない。
