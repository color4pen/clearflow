# 設定系ページの repository 直接呼び出しを usecase 経由に移行

## Meta

- **type**: refactor
- **slug**: usecase-page-settings
- **base-branch**: main
- **adr**: false

## 背景

Server Component（page.tsx）から repository を直接 import して呼び出している箇所が設定系ページに 6 ファイルある。アーキテクチャの層分離を維持するため、usecase 経由に変更する。

## 現状コードの前提

- `src/app/(dashboard)/settings/audit-logs/page.tsx:3` — auditLogRepository を直接 import
- `src/app/(dashboard)/settings/policies/page.tsx:5` — approvalTemplateRepository を直接 import
- `src/app/(dashboard)/settings/policies/new/page.tsx:4` — approvalTemplateRepository を直接 import
- `src/app/(dashboard)/settings/policies/[id]/edit/page.tsx:7` — 複数の repository を直接 import
- `src/app/(dashboard)/settings/templates/[id]/edit/page.tsx:3` — approvalTemplateRepository を直接 import
- `src/app/(dashboard)/settings/webhooks/page.tsx` — webhookEndpointRepository を直接 import（要確認）

## 要件

1. **不足 usecase の新設**: 以下の読み取り専用 usecase を新設する
   - `listAuditLogs(organizationId, filters)` — auditLogRepository.findByOrganization のラッパー
   - `listApprovalTemplates(organizationId)` — approvalTemplateRepository.findByOrganization のラッパー
   - `getApprovalTemplate(templateId, organizationId)` — approvalTemplateRepository.findById のラッパー
   - `getApprovalPolicy(policyId, organizationId)` — approvalPolicyRepository.findById のラッパー
   - `listWebhookEndpoints(organizationId)` — webhookEndpointRepository.findByOrganization のラッパー（既存になければ）
   - その他、実装時に不足が見つかった usecase
2. **page.tsx の import 切り替え**: 全対象ファイルの repository import を usecase import に切り替える

## スコープ外

- 営業系ページ（F01a で対応）
- usecase のビジネスロジック追加
- テストの追加

## 受け入れ基準

- [ ] 設定系の全 page.tsx から `@/infrastructure/repositories` の import がなくなっている
- [ ] 全ページが usecase 経由でデータを取得している
- [ ] 既存の画面動作に変更がない
- [ ] `typecheck && test` が green

## architect 評価済みの設計判断

1. **薄いラッパー usecase** — F01a と同じ方針。層分離を維持するためのラッパー
