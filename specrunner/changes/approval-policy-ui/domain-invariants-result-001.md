# Domain Invariants Review — approval-policy-ui — iter 1

<!-- FORMAT:
- verdict line: `- **verdict**: <approved|needs-fix|escalation>`
- Findings table: # | Severity | Category | File | Description | How to Fix
- Severity values: CRITICAL | HIGH | MEDIUM | LOW
-->

- **verdict**: needs-fix
- **iteration**: 001
- **reviewer**: domain-invariants
- **purpose**: テナント分離と監査ログの完全性を保証する。承認ワークフローの不変条件が変更によって破壊されていないことを検証する。

---

## Scope Reviewed

| Area | Target |
|------|--------|
| Tenant isolation | `policies.ts` アクション全件、ページコンポーネント全件 |
| Audit log completeness | `policies.ts` vs 既存 usecase パターン（`createTemplate`, `updateTemplate`, `deleteTemplate`, `createDelegation`, `deactivateDelegation`, `updateUserRole`） |
| Approval workflow invariants | `evaluatePolicies.ts`（既存）、`togglePolicyAction`（新規）、`policySchema` のバリデーション |
| Cross-tenant reference | `templateId` フィールドの org スコープ検証 |

---

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Audit Log Completeness | `src/app/actions/policies.ts` | `createPolicyAction`, `updatePolicyAction`, `togglePolicyAction` のいずれも `auditLogRepository.create()` を呼び出さない。`approvalSettings` ドメインの既存操作（テンプレート作成/更新/削除、代理承認作成/無効化、ユーザーロール変更）はすべて DB トランザクション内で原子的に監査ログを記録している。ポリシーの有効/無効切り替えは承認ワークフロー（`evaluatePolicies`）に直接影響するにもかかわらず、操作者・日時・前後状態の証跡が `/settings/audit-logs` に記録されない。コンプライアンス上の監査証跡に欠陥が生じる。 | `src/application/usecases/` に `createPolicy.ts` / `updatePolicy.ts` / `togglePolicy.ts`（または共通 `policyMutation.ts`）を新設し、`approvalPolicyRepository` の呼び出しと `auditLogRepository.create()` を同一 DB トランザクション内で実行する。`policies.ts` のアクションはこれらの usecase を経由するよう変更する。`design.md D2` に追記して「監査ログが必要になった時点で usecase を抽出する」から「本レビューにより即時対応に変更」と記録する。 |
| 2 | MEDIUM | Tenant Isolation | `src/app/actions/policies.ts` (createPolicyAction, updatePolicyAction) | `formData.get("templateId")` の値が `session.user.organizationId` に属するテンプレートであることを検証していない。DB スキーマには `templateId → approvalTemplates.id` の FK のみで、テンプレートと組織の複合制約はない。UI では `findByOrganization()` で絞り込んだ選択肢のみ表示されるが、Server Action の FormData は改ざん可能。悪意ある admin が他テナントのテンプレート UUID を知っている場合、自テナントのポリシーが他テナントのテンプレートを参照するクロステナントリンクを作成できる。 | `createPolicyAction` / `updatePolicyAction` 内でバリデーション後、`approvalTemplateRepository.findById(data.templateId, session.user.organizationId)` を呼び出し、テンプレートが同一組織に属することを確認してから `approvalPolicyRepository.create/updateById` を呼ぶ。存在しない場合は `{ success: false, message: "テンプレートが見つかりません" }` を返す。 |
| 3 | LOW | Approval Workflow Invariants | `src/app/actions/policies.ts` | `policySchema` の `triggerAction` が `z.string().min(1)` のみで、受け入れ値の制限がない。UI の select は `TRIGGER_ACTION_OPTIONS`（3 種）で絞り込まれるが、Server Action は直接呼び出し可能。未定義の triggerAction が DB に保存されると `evaluatePolicies.ts` の `findActiveByTriggerAction` で一致しない「サイレント障害」となり、承認ワークフローが意図せずスキップされる。この問題は `spec-review-result-001.md` MEDIUM finding 1 でも指摘されたが実装に未反映。 | `z.enum(["inquiry.convert", "contract.create", "contract.cancel"] as const)` に変更し、`TRIGGER_ACTION_OPTIONS` と値域を同期する。将来のトリガー追加時は両者を同時に更新するよう `constants.ts` にコメントを追記する。 |

---

## Tenant Isolation — Detailed Analysis

| Operation | organizationId スコープ | 評価 |
|-----------|------------------------|------|
| `listPoliciesAction` | `findByOrganization(session.user.organizationId)` | ✅ |
| `createPolicyAction` | `create({ organizationId: session.user.organizationId, ... })` | ✅（ただし templateId の org 帰属未検証 → Finding 2） |
| `updatePolicyAction` | `updateById(id, session.user.organizationId, ...)` — WHERE 句に組織 ID | ✅（同上） |
| `togglePolicyAction` | `findById(policyId, session.user.organizationId)` → `updateById(policyId, session.user.organizationId, ...)` | ✅ |
| PoliciesPage | `canPerform` + `session.user.organizationId` | ✅ |
| NewPolicyPage | `canPerform(createPolicy)` + `findByOrganization(organizationId)` | ✅ |
| EditPolicyPage | `canPerform(editPolicy)` + `findById(id, organizationId)` | ✅ |

基本的なテナント分離（ポリシー自体の CRUD）は正しく実装されている。`togglePolicyAction` のインラインクロージャが `policyId` をサーバー側でバインドする設計も IDOR 耐性として適切。

---

## Audit Log Completeness — Pattern Comparison

| 操作 | usecase 経由 | 監査ログ記録 | トランザクション |
|------|------------|------------|----------------|
| template.create | ✅ `createTemplate.ts` | ✅ `"template.create"` | ✅ |
| template.update | ✅ `updateTemplate.ts` | ✅ `"template.update"` | ✅ |
| template.delete | ✅ `deleteTemplate.ts` | ✅ `"template.delete"` | ✅ |
| delegation.create | ✅ `createDelegation.ts` | ✅ `"delegation.create"` | ✅ |
| delegation.deactivate | ✅ `deactivateDelegation.ts` | ✅ `"delegation.deactivate"` | ✅ |
| user.updateRole | ✅ `updateUserRole.ts` | ✅ `"user.updateRole"` | ✅ |
| **policy.create** | ❌ 直接 repository 呼び出し | ❌ **なし** | ❌ |
| **policy.update** | ❌ 直接 repository 呼び出し | ❌ **なし** | ❌ |
| **policy.toggle** | ❌ 直接 repository 呼び出し | ❌ **なし** | ❌ |

`approvalSettings` ドメインのすべての既存ミューテーション操作が監査ログを記録しているのに対し、今回追加されたポリシー操作は 3 件すべてで欠落している。特に `togglePolicyAction`（`isActive` の切り替え）は承認ワークフローの起動判定に直接影響する操作であり、監査ログの欠落は重大なコンプライアンスリスク。

---

## Approval Workflow Invariants — Analysis

- **`evaluatePolicies.ts` への影響**: 既存の `evaluatePolicies` ユースケースは `findActiveByTriggerAction(organizationId, triggerAction)` で有効ポリシーを取得する。新規 UI でポリシーを作成・編集・トグルしても、`organizationId` スコープ・`isActive` フィルタは repository レイヤーで保証されており、評価ロジック自体への破壊的変更はない。
- **`isActive` トグルの原子性**: `togglePolicyAction` は `findById` → `!current.isActive` → `updateById` の read-modify-write パターン。並行リクエストによる競合（同一ポリシーへの同時トグル）は楽観的ロックなしでは防げないが、これは本変更の導入ではなくシステム全体の設計トレードオフであり本変更の責任範囲外。
- **条件の整合性チェック**: DB スキーマに `approval_policies_condition_check` constraint が定義されており、`conditionField/conditionOperator/conditionValue` の三値が「全 NULL または全 非 NULL」であることを DB レベルで強制。`policySchema` の `superRefine` と二重に保護されており、条件整合性の不変条件は保たれている。

---

## Summary

コアの承認ワークフロー（`evaluatePolicies`）が破壊されているわけではなく、テナント分離の基本実装も正しい。しかし以下 2 点がドメイン不変条件レビューの判定基準を超える問題として検出された。

1. **HIGH / Finding 1**: `approvalSettings` ドメイン全操作に適用される「設定変更は監査ログに原子的に記録される」という確立済み不変条件が、ポリシー操作 3 件すべてで破られている。`design.md D2` の「将来 usecase を抽出する」という方針は設計ドキュメントとして理解できるが、本レビューの観点（監査ログ完全性）では現時点での修正が必要。
2. **MEDIUM / Finding 2**: `templateId` の org 帰属検証が欠如しており、マルチテナント SaaS の「テナントは他テナントリソースを参照できない」という不変条件に対する防衛層が不足している。
