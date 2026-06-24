# Domain Invariants Review — approval-policy-ui — iter 2

<!-- FORMAT:
- verdict line: `- **verdict**: <approved|needs-fix|escalation>`
- Findings table: # | Severity | Category | File | Description | How to Fix
- Severity values: CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: needs-fix
- **iteration**: 002
- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## iter 1 Findings の解消状況

| Finding (iter 1) | Severity | 解消状況 |
|-----------------|----------|---------|
| 1: 監査ログ欠落（create/update/toggle） | HIGH | ✅ 解消 |
| 2: templateId の org 帰属未検証 | MEDIUM | ✅ 解消 |
| 3: triggerAction enum 未制限 | LOW | ❌ 未解消 |

---

## Scope Reviewed

| Area | Target |
|------|--------|
| Audit log completeness | `createPolicy.ts`, `updatePolicy.ts`, `togglePolicy.ts` の usecase 実装 |
| Tenant isolation | `createPolicy.ts` / `updatePolicy.ts` の templateId 帰属検証 |
| Approval workflow invariants | `policySchema.triggerAction` バリデーション、`!isActive` 反転ロジック |
| Test suite integrity | `policiesActions.test.ts` — `bun test` 実行結果の確認 |

---

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Test Suite | `src/__tests__/settings/policiesActions.test.ts` | `bun test` が 4 件失敗。TC-010（`approvalPolicyRepository.create`）、TC-011（`approvalPolicyRepository.updateById`）、TC-012（`approvalPolicyRepository.findById`、`!current.isActive`）の各テストが `policies.ts` を静的解析しているが、iter 1 の HIGH finding 対応として usecase 層を抽出した結果、これらのリポジトリ呼び出しは `createPolicy.ts`・`updatePolicy.ts`・`togglePolicy.ts` に移動した。`policies.ts` には `.create` / `.updateById` / `.findById` / `!current.isActive` の文字列が存在しないためアサーション失敗。受け入れ基準 T-08「`bun test` が全件 pass」が未達。 | 4 つの失敗テストを usecase ファイルを検証するよう更新する。具体的には: (1) TC-010: `readSrc("application/usecases/createPolicy.ts")` で `approvalPolicyRepository.create` を検証。(2) TC-011: `readSrc("application/usecases/updatePolicy.ts")` で `approvalPolicyRepository.updateById` を検証。(3) TC-012-a: `readSrc("application/usecases/togglePolicy.ts")` で `approvalPolicyRepository.findById` を検証。(4) TC-012-b: `readSrc("application/usecases/togglePolicy.ts")` で `!current.isActive` を検証。また、`policies.ts` の TC-010〜012 のアサーションを、usecase 経由で動作することを示す形（`createPolicy` / `updatePolicy` / `togglePolicy` の import 存在確認）に切り替えるとより堅牢になる。 |
| 2 | LOW | Approval Workflow Invariants | `src/app/actions/policies.ts` | `policySchema` の `triggerAction` が `z.string().min(1)` のみで受け入れ値を制限しない。iter 1 Finding 3 から引き続き未解消。UI の select は `TRIGGER_ACTION_OPTIONS`（3 種）に限定されるが、Server Action への直接呼び出しで任意の文字列を渡せるため、`evaluatePolicies.ts` の `findActiveByTriggerAction` で一致しない「サイレントスキップ」が発生しうる。 | `z.enum(["inquiry.convert", "contract.create", "contract.cancel"] as const)` に変更し、`TRIGGER_ACTION_OPTIONS` と値域を同期させる。 |

---

## iter 1 HIGH / MEDIUM Findings の解消確認

### Finding 1（HIGH）: 監査ログ完全性 — 解消 ✅

3 つの usecase が新設され、すべての状態変更操作が `db.transaction()` 内で `auditLogRepository.create()` を原子的に呼び出している。

| usecase | 監査ログ action | トランザクション |
|---------|----------------|----------------|
| `createPolicy.ts` | `"policy.create"` | ✅ `db.transaction()` |
| `updatePolicy.ts` | `"policy.update"` | ✅ `db.transaction()` |
| `togglePolicy.ts` | `"policy.activate"` / `"policy.deactivate"` | ✅ `db.transaction()` |

監査レコードには `action`, `targetType`, `targetId`, `actorId`, `organizationId`, `metadata` が含まれており、既存パターン（`createTemplate.ts` 等）と一致している。`auditLogRepository` に UPDATE / DELETE 操作は存在せず、append-only 不変条件は保たれている。

### Finding 2（MEDIUM）: templateId cross-tenant 検証 — 解消 ✅

`createPolicy.ts` と `updatePolicy.ts` の両方で、DB 操作前に `approvalTemplateRepository.findById(templateId, organizationId)` を呼び出してテンプレートの org 帰属を検証している。`findById(id, organizationId)` は WHERE 句に `AND organizationId = $orgId` を含む実装であり、他テナントのテンプレート UUID を渡した場合は `null` が返り、`ok: false` でエラーを返す。

---

## Tenant Isolation — Detailed Analysis

| Operation | organizationId スコープ | templateId org 帰属 | 評価 |
|-----------|------------------------|-------------------|------|
| `listPoliciesAction` | `findByOrganization(session.user.organizationId)` | N/A | ✅ |
| `createPolicyAction` → `createPolicy` usecase | `create({ organizationId: session.user.organizationId })` | `findById(templateId, organizationId)` | ✅ |
| `updatePolicyAction` → `updatePolicy` usecase | `updateById(id, session.user.organizationId, ...)` | `findById(templateId, organizationId)` | ✅ |
| `togglePolicyAction` → `togglePolicy` usecase | `findById(id, organizationId)` → `updateById(id, organizationId, ...)` | N/A | ✅ |
| PoliciesPage | `canPerform` + `session.user.organizationId` | N/A | ✅ |
| NewPolicyPage | `canPerform(createPolicy)` + `findByOrganization(organizationId)` | N/A | ✅ |
| EditPolicyPage | `canPerform(editPolicy)` + `findById(id, organizationId)` | N/A | ✅ |

テナント分離の基本実装は正しく保たれている。`organizationId` はすべてセッション（`session.user.organizationId`）から取得しており、リクエストボディから受け取っていない。

---

## Audit Log Completeness — Pattern Comparison

| 操作 | usecase 経由 | 監査ログ記録 | トランザクション |
|------|------------|------------|----------------|
| template.create | ✅ | ✅ `"template.create"` | ✅ |
| template.update | ✅ | ✅ `"template.update"` | ✅ |
| template.delete | ✅ | ✅ `"template.delete"` | ✅ |
| delegation.create | ✅ | ✅ `"delegation.create"` | ✅ |
| delegation.deactivate | ✅ | ✅ `"delegation.deactivate"` | ✅ |
| user.updateRole | ✅ | ✅ `"user.updateRole"` | ✅ |
| **policy.create** | ✅ `createPolicy.ts` | ✅ `"policy.create"` | ✅ |
| **policy.update** | ✅ `updatePolicy.ts` | ✅ `"policy.update"` | ✅ |
| **policy.toggle** | ✅ `togglePolicy.ts` | ✅ `"policy.activate"` / `"policy.deactivate"` | ✅ |

iter 1 で指摘した監査ログ欠落はすべて解消されており、`approvalSettings` ドメイン全操作で監査ログが一貫して記録されるようになった。

---

## Approval Workflow Invariants — Analysis

- **`evaluatePolicies.ts` への影響**: 既存の評価ロジックへの変更はなく、`organizationId` スコープ・`isActive` フィルタは repository レイヤーで保証されている。
- **`isActive` トグルの原子性**: `togglePolicy.ts` は `findById` → `!current.isActive` → `updateById` + audit log を単一トランザクション内で実行。DB 外での read-modify-write に伴うレースコンディションは楽観的ロック不在の設計トレードオフであり本変更の責任範囲外。
- **条件の整合性**: DB の `approval_policies_condition_check` constraint と `policySchema.superRefine` の二重防衛は維持されている。
- **`triggerAction` 制限**: 前述 Finding 2 の通り、引き続き `z.string().min(1)` で任意値を受け入れる（LOW）。

---

## Summary

iter 1 の HIGH（監査ログ欠落）と MEDIUM（templateId cross-tenant 検証）は usecase 層の新設によって正しく解消された。ドメイン不変条件そのものは現在すべて保たれている。

しかし usecase 抽出に伴いテストが陳腐化し、`bun test` が 4 件失敗する状態となっている。受け入れ基準 T-08（`bun test` 全件 pass）を満たすために、失敗している静的解析テストを usecase ファイルを対象とするよう修正する必要がある。

修正対応の優先度:
1. **HIGH / Finding 1**: 4 件のテスト失敗を修正し、`bun test` を green に戻す
2. **LOW / Finding 2**: `triggerAction` を `z.enum()` に変更（iter 1 からの持ち越し）
