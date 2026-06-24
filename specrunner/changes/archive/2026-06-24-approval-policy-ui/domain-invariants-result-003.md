# Domain Invariants Review — approval-policy-ui — iter 3

<!-- FORMAT:
- verdict line: `- **verdict**: <approved|needs-fix|escalation>`
- Findings table: # | Severity | Category | File | Description | How to Fix
- Severity values: CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: approved
- **iteration**: 003
- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## iter 2 Findings の解消状況

| Finding (iter 2) | Severity | 解消状況 |
|-----------------|----------|---------|
| 1: テスト 4 件失敗（usecase 抽出後の静的解析テストが陳腐化） | HIGH | ✅ 解消 |
| 2: triggerAction が z.string().min(1) のまま（iter 1 からの持ち越し） | LOW | ❌ 未解消（3 回目） |

---

## Scope Reviewed

| Area | Target |
|------|--------|
| Audit log completeness | `createPolicy.ts`, `updatePolicy.ts`, `togglePolicy.ts` — 全 usecase 実装の継続確認 |
| Tenant isolation | `createPolicy.ts` / `updatePolicy.ts` の templateId 帰属検証の継続確認 |
| Approval workflow invariants | `policySchema.triggerAction` バリデーション、usecase の `isActive` 反転ロジック |
| Test suite integrity | `bun test` 全件（890 tests across 43 files） |

---

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | LOW | Approval Workflow Invariants | `src/app/actions/policies.ts` | `policySchema.triggerAction` が `z.string().min(1)` のまま。iter 1 / iter 2 から 3 回連続で未解消。UI の select は `TRIGGER_ACTION_OPTIONS`（3 種）に限定されるが、Server Action への直接呼び出しで任意文字列が通過し、`evaluatePolicies.ts` の `findActiveByTriggerAction` でサイレントスキップが発生しうる。深刻度 LOW のためこのイテレーションの承認を妨げないが、次の機能追加前に解消を推奨する。 | `z.enum(["inquiry.convert", "contract.create", "contract.cancel"] as const)` に変更。`TRIGGER_ACTION_OPTIONS` の value 配列と値域を同期する。`constants.ts` に「トリガーアクションを追加する際は policySchema の enum も同時に更新する」旨のコメントを追記するとよい。 |

---

## iter 2 Findings の解消確認

### Finding 1（HIGH）: テスト失敗 — 解消 ✅

`bun test` を実行した結果、890 tests pass / 0 fail。`policiesActions.test.ts`（17 件）・`policyConstants.test.ts`（13 件）ともに全件 pass。

テスト修正の内容を確認した：

| テスト (iter 2 指摘) | 修正後の検証対象 | 結果 |
|--------------------|---------------|------|
| TC-010: `approvalPolicyRepository.create` | `readSrc("application/usecases/createPolicy.ts")` | ✅ pass |
| TC-011: `approvalPolicyRepository.updateById` | `readSrc("application/usecases/updatePolicy.ts")` | ✅ pass |
| TC-012-a: `approvalPolicyRepository.findById` | `readSrc("application/usecases/togglePolicy.ts")` | ✅ pass |
| TC-012-b: `!current.isActive` 反転ロジック | `readSrc("application/usecases/togglePolicy.ts")` | ✅ pass |

注: `togglePolicy.ts` は `const newIsActive = !current.isActive;` と記述しており、テストが期待する `!current.isActive` の文字列が含まれている。

---

## Tenant Isolation — Detailed Analysis

| Operation | organizationId スコープ | templateId org 帰属 | 評価 |
|-----------|------------------------|-------------------|------|
| `listPoliciesAction` | `findByOrganization(session.user.organizationId)` | N/A | ✅ |
| `createPolicyAction` → `createPolicy` usecase | `create({ organizationId: session.user.organizationId })` | `findById(templateId, organizationId)` による cross-tenant guard | ✅ |
| `updatePolicyAction` → `updatePolicy` usecase | `updateById(id, session.user.organizationId, ...)` | `findById(templateId, organizationId)` による cross-tenant guard | ✅ |
| `togglePolicyAction` → `togglePolicy` usecase | `findById(id, organizationId)` → `updateById(id, organizationId, ...)` | N/A | ✅ |
| PoliciesPage | `canPerform` + `session.user.organizationId` | N/A | ✅ |
| NewPolicyPage | `canPerform(createPolicy)` + `findByOrganization(organizationId)` | N/A | ✅ |
| EditPolicyPage | `canPerform(editPolicy)` + `findById(id, organizationId)` | N/A | ✅ |

`organizationId` はすべてセッション（`session.user.organizationId`）から取得しており、リクエストボディからの受け取りは行われていない。テナント分離の不変条件は維持されている。

---

## Audit Log Completeness — Pattern Comparison

| 操作 | usecase 経由 | 監査ログ action | トランザクション |
|------|------------|---------------|----------------|
| template.create | ✅ | `"template.create"` | ✅ |
| template.update | ✅ | `"template.update"` | ✅ |
| template.delete | ✅ | `"template.delete"` | ✅ |
| delegation.create | ✅ | `"delegation.create"` | ✅ |
| delegation.deactivate | ✅ | `"delegation.deactivate"` | ✅ |
| user.updateRole | ✅ | `"user.updateRole"` | ✅ |
| **policy.create** | ✅ `createPolicy.ts` | `"policy.create"` | ✅ `db.transaction()` |
| **policy.update** | ✅ `updatePolicy.ts` | `"policy.update"` | ✅ `db.transaction()` |
| **policy.toggle** | ✅ `togglePolicy.ts` | `"policy.activate"` / `"policy.deactivate"` | ✅ `db.transaction()` |

`approvalSettings` ドメイン全操作で監査ログが一貫して原子的に記録されている。append-only 不変条件（`auditLogRepository` に UPDATE / DELETE なし）も維持されている。

---

## Approval Workflow Invariants — Analysis

- **`evaluatePolicies.ts` への影響**: 既存評価ロジックへの変更なし。`organizationId` スコープ・`isActive` フィルタは repository レイヤーで保証されている。
- **`isActive` トグルの原子性**: `togglePolicy.ts` は `findById` → `!current.isActive` → `updateById` + audit log を単一トランザクション内で実行。
- **条件の整合性**: DB の `approval_policies_condition_check` constraint と `policySchema.superRefine` の二重防衛は維持されている。
- **`triggerAction` 制限**: 前述 Finding 1 の通り LOW 課題として継続（3 回目）。

---

## Summary

iter 2 の HIGH finding（テスト 4 件失敗）は、失敗していた静的解析テストを usecase ファイルを対象とするよう修正することで解消された。`bun test` は 890 件全件 pass の状態。

テナント分離・監査ログ完全性・承認ワークフロー不変条件のすべてが維持されており、ドメイン不変条件の観点でブロッキングな問題は存在しない。`triggerAction` の `z.enum()` 化（LOW）は 3 イテレーション継続中の推奨事項として残るが、承認を妨げる問題ではない。
