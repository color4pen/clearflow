# Domain Invariants Review: usecase-page-settings

- **reviewer**: domain-invariants
- **iteration**: 1
- **verdict**: approved

---

## 観点

テナント分離・監査ログの完全性・承認ワークフロー不変条件の維持を確認する。

---

## 1. テナント分離

### 結果: 問題なし

新設 4 usecase はいずれも `organizationId` を必須引数として受け取り、そのままリポジトリメソッドに委譲している。

| Usecase | リポジトリ呼び出し | テナント条件 |
|---------|------------------|------------|
| `listAuditLogs` | `auditLogRepository.findByOrganization(organizationId, filters)` | `eq(auditLogs.organizationId, organizationId)` ✓ |
| `listApprovalTemplates` | `approvalTemplateRepository.findByOrganization(organizationId)` | `eq(approvalTemplates.organizationId, organizationId)` ✓ |
| `getApprovalTemplate` | `approvalTemplateRepository.findById(templateId, organizationId)` | `and(eq(id), eq(organizationId))` ✓ |
| `getApprovalPolicy` | `approvalPolicyRepository.findById(policyId, organizationId)` | `and(eq(id), eq(organizationId))` ✓ |

**organizationId の取得元**: 全 page.tsx が `session.user.organizationId`（認証済みセッション）から取得しており、リクエストボディや URL パラメータから受け取っていない。

```ts
// 例: policies/[id]/edit/page.tsx
const { id } = await params;  // URL パラメータ（リソース ID のみ）
const [policy, templates] = await Promise.all([
  getApprovalPolicy({ policyId: id, organizationId: session.user.organizationId }),
  listApprovalTemplates({ organizationId: session.user.organizationId }),
]);
```

URL パラメータ `id` はリソース識別子として使用されるが、必ず `session.user.organizationId` と組み合わせてリポジトリへ渡される。リポジトリの `findById` は `and(eq(id), eq(organizationId))` で複合条件を強制しており、ID 単独での認可判断は存在しない。

他テナントのリソース ID を URL に指定しても、organizationId の不一致により `null` が返り、page.tsx の `notFound()` に落ちる。

---

## 2. 監査ログの完全性

### 結果: 問題なし

本変更は純粋な**読み取り専用リファクタリング**であり、状態変更操作（INSERT / UPDATE / DELETE）を一切追加していない。

- 新設 usecase 4 件はすべて SELECT 系であり、データの変更を行わない
- 監査ログテーブル（`auditLogs`）に対する UPDATE / DELETE 操作は存在しない
- `listAuditLogs` は `auditLogRepository.findByOrganization` の薄いラッパーであり、監査レコードの読み取りのみを行う
- 既存の状態変更ユースケース（`createPolicy`, `updatePolicy`, `togglePolicy` 等）は変更されていない。これらが保持する監査ログ記録パターン（同一トランザクション内での append-only 記録）は維持されている

新たな状態変更操作が追加されていないため、「新しい状態変更操作に対応する監査ログが必要」という判定基準には該当しない。

---

## 3. 承認ワークフロー不変条件

### 結果: 問題なし

新設 usecase はすべて読み取り専用であり、承認ワークフローの状態遷移に影響しない。

- `getApprovalPolicy` / `getApprovalTemplate` は参照のみ（ポリシー・テンプレートの状態は変更しない）
- `listApprovalTemplates` / `listAuditLogs` は一覧取得のみ
- 承認フロー（`approveRequest`, `rejectRequest`, `submitRequest`, `evaluatePolicies` 等）は変更されていない
- `policies/[id]/edit/page.tsx` において `policy` が `null`（存在しない、または他テナント所有）の場合の `notFound()` 動作が維持されている

`policies/page.tsx` で残存している `listPoliciesAction` (action → repository 直接呼び出し) はスコープ外と明示されており、本変更が導入したものではない。

---

## 判定

- **verdict**: approved

テナント分離・監査ログ完全性・承認ワークフロー不変条件のいずれも維持されている。本変更は読み取り専用の薄いラッパー usecase を 4 件新設し、page.tsx の import を切り替えたのみであり、ドメイン不変条件を破壊する要素は存在しない。
