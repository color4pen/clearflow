# Test Cases: 設定系ページの repository 直接呼び出しを usecase 経由に移行

## Summary

- **Total**: 21 cases
- **Automated** (unit/integration): 19
- **Manual**: 2
- **Priority**: must: 19, should: 2, could: 0

---

### TC-001: audit-logs ページが usecase 経由でデータを取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 設定系 page.tsx から repository の直接 import を排除する > Scenario: audit-logs ページが usecase 経由でデータを取得する

---

### TC-002: policies 一覧ページが usecase 経由でテンプレートを取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 設定系 page.tsx から repository の直接 import を排除する > Scenario: policies 一覧ページが usecase 経由でテンプレートを取得する

---

### TC-003: 新規ポリシーページが usecase 経由でテンプレートを取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 設定系 page.tsx から repository の直接 import を排除する > Scenario: 新規ポリシーページが usecase 経由でテンプレートを取得する

---

### TC-004: ポリシー編集ページが usecase 経由でデータを取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 設定系 page.tsx から repository の直接 import を排除する > Scenario: ポリシー編集ページが usecase 経由でデータを取得する

---

### TC-005: テンプレート編集ページが usecase 経由でデータを取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 設定系 page.tsx から repository の直接 import を排除する > Scenario: テンプレート編集ページが usecase 経由でデータを取得する

---

### TC-006: listAuditLogs が repository と同一の結果を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 新設 usecase は repository メソッドの薄いラッパーである > Scenario: listAuditLogs が repository と同一の結果を返す

---

### TC-007: listApprovalTemplates が repository と同一の結果を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 新設 usecase は repository メソッドの薄いラッパーである > Scenario: listApprovalTemplates が repository と同一の結果を返す

---

### TC-008: getApprovalTemplate が repository と同一の結果を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 新設 usecase は repository メソッドの薄いラッパーである > Scenario: getApprovalTemplate が repository と同一の結果を返す

---

### TC-009: getApprovalPolicy が repository と同一の結果を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 新設 usecase は repository メソッドの薄いラッパーである > Scenario: getApprovalPolicy が repository と同一の結果を返す

---

### TC-010: typecheck と test が green

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存の画面動作に変更がない > Scenario: typecheck と test が green

---

### TC-011: listAuditLogs が index.ts から re-export されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/application/usecases/listAuditLogs.ts` が作成されている
**WHEN** `src/application/usecases/index.ts` の export 内容を確認する
**THEN** `export { listAuditLogs } from "./listAuditLogs"` が含まれており、`@/application/usecases` から `listAuditLogs` を import できる

---

### TC-012: listApprovalTemplates が index.ts から re-export されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/application/usecases/listApprovalTemplates.ts` が作成されている
**WHEN** `src/application/usecases/index.ts` の export 内容を確認する
**THEN** `export { listApprovalTemplates } from "./listApprovalTemplates"` が含まれており、`@/application/usecases` から `listApprovalTemplates` を import できる

---

### TC-013: getApprovalTemplate が index.ts から re-export されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/application/usecases/getApprovalTemplate.ts` が作成されている
**WHEN** `src/application/usecases/index.ts` の export 内容を確認する
**THEN** `export { getApprovalTemplate } from "./getApprovalTemplate"` が含まれており、`@/application/usecases` から `getApprovalTemplate` を import できる

---

### TC-014: getApprovalPolicy が index.ts から re-export されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/application/usecases/getApprovalPolicy.ts` が作成されている
**WHEN** `src/application/usecases/index.ts` の export 内容を確認する
**THEN** `export { getApprovalPolicy } from "./getApprovalPolicy"` が含まれており、`@/application/usecases` から `getApprovalPolicy` を import できる

---

### TC-015: audit-logs/page.tsx の全フィルタが usecase に渡されている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/app/(dashboard)/settings/audit-logs/page.tsx` が usecase 経由に切り替え済みである
**WHEN** `listAuditLogs` の呼び出し箇所を確認する
**THEN** `filters` オブジェクト内に `startDate`, `endDate`, `action`, `actorId`, `targetType`, `limit`, `offset` が全て含まれており、元の repository 呼び出しと同じ引数が渡されている

---

### TC-016: policies/page.tsx で listPoliciesAction の呼び出しが維持されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `src/app/(dashboard)/settings/policies/page.tsx` が usecase 経由に切り替え済みである
**WHEN** ファイルの呼び出し箇所を確認する
**THEN** `listPoliciesAction` の呼び出しが削除・変更されておらず、ポリシー一覧データが引き続き action 経由で取得されている

---

### TC-017: policies/[id]/edit の Promise.all 内 2 呼び出しが両方 usecase 経由になっている

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/app/(dashboard)/settings/policies/[id]/edit/page.tsx` が usecase 経由に切り替え済みである
**WHEN** `Promise.all` の呼び出しブロックを確認する
**THEN** `getApprovalPolicy({ policyId: id, organizationId: ... })` と `listApprovalTemplates({ organizationId: ... })` の 2 つが `Promise.all` 内に存在し、どちらも `@/infrastructure/repositories` を参照していない

---

### TC-018: policies/[id]/edit で policy が null の場合に notFound() が呼ばれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `getApprovalPolicy` が `null` を返す状況（存在しない policyId を指定）
**WHEN** `src/app/(dashboard)/settings/policies/[id]/edit/page.tsx` がレンダリングされる
**THEN** `notFound()` が呼ばれ、404 レスポンスが返される

---

### TC-019: templates/[id]/edit で template が null の場合に notFound() が呼ばれる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `getApprovalTemplate` が `null` を返す状況（存在しない templateId を指定）
**WHEN** `src/app/(dashboard)/settings/templates/[id]/edit/page.tsx` がレンダリングされる
**THEN** `notFound()` が呼ばれ、404 レスポンスが返される

---

### TC-020: 設定系全ページで @/infrastructure/repositories の import が 0 件

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** 全対象 page.tsx の import 切り替えが完了している
**WHEN** `grep -r "@/infrastructure/repositories" src/app/(dashboard)/settings/` を実行する
**THEN** 出力が空（0 件）である

---

### TC-021: webhooks/page.tsx が変更されていない

**Category**: manual
**Priority**: should
**Source**: design.md > D4: webhooks/page.tsx は対象外とする

**GIVEN** 本リファクタリングの全変更が完了している
**WHEN** `src/app/(dashboard)/settings/webhooks/page.tsx` の内容を確認する
**THEN** `@/infrastructure/repositories` の import が元々なく、本リファクタリングによる変更が加えられていない（`listWebhookEndpointsAction` 経由のまま維持されている）

---

## Result

```yaml
result: completed
total: 21
automated: 19
manual: 2
must: 19
should: 2
could: 0
blocked_reasons: []
```
