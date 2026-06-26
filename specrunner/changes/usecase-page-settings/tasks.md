# Tasks: 設定系ページの repository 直接呼び出しを usecase 経由に移行

## T-01: listAuditLogs usecase の新設

- [ ] `src/application/usecases/listAuditLogs.ts` を作成する
  - `auditLogRepository` を `@/infrastructure/repositories` から import する
  - `AuditLog` 型を `@/domain/models/auditLog` から import する
  - `listAuditLogs(data: { organizationId: string; filters?: { limit?: number; offset?: number; startDate?: Date; endDate?: Date; action?: string; actorId?: string; targetType?: string; } }): Promise<AuditLog[]>` を export する
  - 内部で `auditLogRepository.findByOrganization(data.organizationId, data.filters)` を呼んで返す
- [ ] `src/application/usecases/index.ts` に `export { listAuditLogs } from "./listAuditLogs";` を追加する

**Acceptance Criteria**:
- `listAuditLogs` が `auditLogRepository.findByOrganization` と同じフィルタ引数を受け取り、同じ結果を返す
- `index.ts` から re-export されている

## T-02: listApprovalTemplates usecase の新設

- [ ] `src/application/usecases/listApprovalTemplates.ts` を作成する
  - `approvalTemplateRepository` を `@/infrastructure/repositories` から import する
  - `ApprovalTemplate` 型を `@/domain/models/approvalTemplate` から import する
  - `listApprovalTemplates(data: { organizationId: string }): Promise<ApprovalTemplate[]>` を export する
  - 内部で `approvalTemplateRepository.findByOrganization(data.organizationId)` を呼んで返す
- [ ] `src/application/usecases/index.ts` に `export { listApprovalTemplates } from "./listApprovalTemplates";` を追加する

**Acceptance Criteria**:
- `listApprovalTemplates` が `approvalTemplateRepository.findByOrganization` と同じ結果を返す
- `index.ts` から re-export されている

## T-03: getApprovalTemplate usecase の新設

- [ ] `src/application/usecases/getApprovalTemplate.ts` を作成する
  - `approvalTemplateRepository` を `@/infrastructure/repositories` から import する
  - `ApprovalTemplate` 型を `@/domain/models/approvalTemplate` から import する
  - `getApprovalTemplate(data: { templateId: string; organizationId: string }): Promise<ApprovalTemplate | null>` を export する
  - 内部で `approvalTemplateRepository.findById(data.templateId, data.organizationId)` を呼んで返す
- [ ] `src/application/usecases/index.ts` に `export { getApprovalTemplate } from "./getApprovalTemplate";` を追加する

**Acceptance Criteria**:
- `getApprovalTemplate` が `approvalTemplateRepository.findById` と同じ結果を返す
- `index.ts` から re-export されている

## T-04: getApprovalPolicy usecase の新設

- [ ] `src/application/usecases/getApprovalPolicy.ts` を作成する
  - `approvalPolicyRepository` を `@/infrastructure/repositories` から import する
  - `ApprovalPolicy` 型を `@/domain/models/approvalPolicy` から import する
  - `getApprovalPolicy(data: { policyId: string; organizationId: string }): Promise<ApprovalPolicy | null>` を export する
  - 内部で `approvalPolicyRepository.findById(data.policyId, data.organizationId)` を呼んで返す
- [ ] `src/application/usecases/index.ts` に `export { getApprovalPolicy } from "./getApprovalPolicy";` を追加する

**Acceptance Criteria**:
- `getApprovalPolicy` が `approvalPolicyRepository.findById` と同じ結果を返す
- `index.ts` から re-export されている

## T-05: audit-logs/page.tsx の import 切り替え

- [ ] `src/app/(dashboard)/settings/audit-logs/page.tsx` を編集する
  - `import { auditLogRepository } from "@/infrastructure/repositories";` を削除する
  - `import { listOrganizationUsers } from "@/application/usecases";` を `import { listAuditLogs, listOrganizationUsers } from "@/application/usecases";` に変更する
  - `auditLogRepository.findByOrganization(session.user.organizationId, { ... })` の呼び出しを `listAuditLogs({ organizationId: session.user.organizationId, filters: { ... } })` に置き換える

**Acceptance Criteria**:
- `audit-logs/page.tsx` に `@/infrastructure/repositories` の import がない
- フィルタ（startDate, endDate, action, actorId, targetType, limit, offset）が全て usecase に渡されている
- 画面表示が変更前と同一

## T-06: policies/page.tsx の import 切り替え

- [ ] `src/app/(dashboard)/settings/policies/page.tsx` を編集する
  - `import { approvalTemplateRepository } from "@/infrastructure/repositories";` を削除する
  - `import { listApprovalTemplates } from "@/application/usecases";` を追加する
  - `approvalTemplateRepository.findByOrganization(session.user.organizationId)` を `listApprovalTemplates({ organizationId: session.user.organizationId })` に置き換える

**Acceptance Criteria**:
- `policies/page.tsx` に `@/infrastructure/repositories` の import がない
- `listPoliciesAction` の呼び出しは既存のまま維持されている
- 画面表示が変更前と同一

## T-07: policies/new/page.tsx の import 切り替え

- [ ] `src/app/(dashboard)/settings/policies/new/page.tsx` を編集する
  - `import { approvalTemplateRepository } from "@/infrastructure/repositories";` を削除する
  - `import { listApprovalTemplates } from "@/application/usecases";` を追加する
  - `approvalTemplateRepository.findByOrganization(session.user.organizationId)` を `listApprovalTemplates({ organizationId: session.user.organizationId })` に置き換える

**Acceptance Criteria**:
- `policies/new/page.tsx` に `@/infrastructure/repositories` の import がない
- 画面表示が変更前と同一

## T-08: policies/[id]/edit/page.tsx の import 切り替え

- [ ] `src/app/(dashboard)/settings/policies/[id]/edit/page.tsx` を編集する
  - `import { approvalPolicyRepository, approvalTemplateRepository } from "@/infrastructure/repositories";` を削除する
  - `import { getApprovalPolicy, listApprovalTemplates } from "@/application/usecases";` を追加する
  - `approvalPolicyRepository.findById(id, session.user.organizationId)` を `getApprovalPolicy({ policyId: id, organizationId: session.user.organizationId })` に置き換える
  - `approvalTemplateRepository.findByOrganization(session.user.organizationId)` を `listApprovalTemplates({ organizationId: session.user.organizationId })` に置き換える

**Acceptance Criteria**:
- `policies/[id]/edit/page.tsx` に `@/infrastructure/repositories` の import がない
- `Promise.all` 内の 2 つの呼び出しが両方とも usecase 経由になっている
- `policy` が `null` の場合の `notFound()` 動作が維持されている
- 画面表示が変更前と同一

## T-09: templates/[id]/edit/page.tsx の import 切り替え

- [ ] `src/app/(dashboard)/settings/templates/[id]/edit/page.tsx` を編集する
  - `import { approvalTemplateRepository } from "@/infrastructure/repositories";` を削除する
  - `import { getApprovalTemplate } from "@/application/usecases";` を追加する
  - `approvalTemplateRepository.findById(id, session.user.organizationId)` を `getApprovalTemplate({ templateId: id, organizationId: session.user.organizationId })` に置き換える

**Acceptance Criteria**:
- `templates/[id]/edit/page.tsx` に `@/infrastructure/repositories` の import がない
- `template` が `null` の場合の `notFound()` 動作が維持されている
- 画面表示が変更前と同一

## T-10: typecheck && test の実行

- [ ] `bun run typecheck` を実行してエラーがないことを確認する
- [ ] `bun run test` を実行して全テストが pass することを確認する
- [ ] 設定系 page.tsx 全ファイルで `@/infrastructure/repositories` の grep 結果が 0 件であることを確認する

**Acceptance Criteria**:
- `typecheck` が green
- `test` が green
- `grep -r "@/infrastructure/repositories" src/app/(dashboard)/settings/` の出力が空
