# Spec: 設定系ページの repository 直接呼び出しを usecase 経由に移行

## Requirements

### Requirement: 設定系 page.tsx から repository の直接 import を排除する

設定系の全 page.tsx ファイルは `@/infrastructure/repositories` を import してはならない（SHALL NOT）。データ取得は `@/application/usecases` 経由で行う。

#### Scenario: audit-logs ページが usecase 経由でデータを取得する

**Given** `src/app/(dashboard)/settings/audit-logs/page.tsx` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure/repositories` からの import が存在せず、`listAuditLogs` を `@/application/usecases` から import している

#### Scenario: policies 一覧ページが usecase 経由でテンプレートを取得する

**Given** `src/app/(dashboard)/settings/policies/page.tsx` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure/repositories` からの import が存在せず、`listApprovalTemplates` を `@/application/usecases` から import している

#### Scenario: 新規ポリシーページが usecase 経由でテンプレートを取得する

**Given** `src/app/(dashboard)/settings/policies/new/page.tsx` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure/repositories` からの import が存在せず、`listApprovalTemplates` を `@/application/usecases` から import している

#### Scenario: ポリシー編集ページが usecase 経由でデータを取得する

**Given** `src/app/(dashboard)/settings/policies/[id]/edit/page.tsx` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure/repositories` からの import が存在せず、`getApprovalPolicy` と `listApprovalTemplates` を `@/application/usecases` から import している

#### Scenario: テンプレート編集ページが usecase 経由でデータを取得する

**Given** `src/app/(dashboard)/settings/templates/[id]/edit/page.tsx` が存在する
**When** ファイルの import 文を確認する
**Then** `@/infrastructure/repositories` からの import が存在せず、`getApprovalTemplate` を `@/application/usecases` から import している

### Requirement: 新設 usecase は repository メソッドの薄いラッパーである

各 usecase は対応する repository メソッドと同一のデータを返す（SHALL）。ビジネスロジックの追加やデータ変換を行ってはならない。

#### Scenario: listAuditLogs が repository と同一の結果を返す

**Given** `listAuditLogs` usecase が存在する
**When** `listAuditLogs({ organizationId, filters })` を呼び出す
**Then** `auditLogRepository.findByOrganization(organizationId, filters)` と同一の `AuditLog[]` が返される

#### Scenario: listApprovalTemplates が repository と同一の結果を返す

**Given** `listApprovalTemplates` usecase が存在する
**When** `listApprovalTemplates({ organizationId })` を呼び出す
**Then** `approvalTemplateRepository.findByOrganization(organizationId)` と同一の `ApprovalTemplate[]` が返される

#### Scenario: getApprovalTemplate が repository と同一の結果を返す

**Given** `getApprovalTemplate` usecase が存在する
**When** `getApprovalTemplate({ templateId, organizationId })` を呼び出す
**Then** `approvalTemplateRepository.findById(templateId, organizationId)` と同一の `ApprovalTemplate | null` が返される

#### Scenario: getApprovalPolicy が repository と同一の結果を返す

**Given** `getApprovalPolicy` usecase が存在する
**When** `getApprovalPolicy({ policyId, organizationId })` を呼び出す
**Then** `approvalPolicyRepository.findById(policyId, organizationId)` と同一の `ApprovalPolicy | null` が返される

### Requirement: 既存の画面動作に変更がない

リファクタリング後の全設定系ページは、リファクタリング前と同一の画面表示・動作を維持する（SHALL）。

#### Scenario: typecheck と test が green

**Given** 全 usecase の新設と page.tsx の import 切り替えが完了している
**When** `bun run typecheck && bun run test` を実行する
**Then** エラーなく全て pass する
