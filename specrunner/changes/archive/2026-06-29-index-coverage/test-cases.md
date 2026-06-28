# Test Cases: index-coverage

## Summary

- **Total**: 23 cases
- **Automated** (unit/integration): 2
- **Manual**: 21
- **Priority**: must: 21, should: 2, could: 0

---

## Schema Definition

### TC-001: inquiries テーブルに (organization_id, created_at) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の inquiries テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("inquiries_org_created_at_idx").on(table.organizationId, table.createdAt)` が存在し、既存のカラム定義に変更がない

---

### TC-002: deals テーブルに (organization_id, created_at) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の deals テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("deals_org_created_at_idx").on(table.organizationId, table.createdAt)` が存在し、既存のカラム定義に変更がない

---

### TC-003: clients テーブルに (organization_id, created_at) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `src/infrastructure/schema.ts` の clients テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("clients_org_created_at_idx").on(table.organizationId, table.createdAt)` が存在し、既存のカラム定義に変更がない

---

### TC-004: contracts テーブルに (organization_id, deal_id) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` の contracts テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("contracts_org_deal_id_idx").on(table.organizationId, table.dealId)` が存在し、既存のカラム定義に変更がない

---

### TC-005: contracts テーブルに (organization_id, client_id) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-02

**GIVEN** `src/infrastructure/schema.ts` の contracts テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("contracts_org_client_id_idx").on(table.organizationId, table.clientId)` が存在し、既存のカラム定義に変更がない

---

### TC-006: invoices テーブルに (organization_id, contract_id) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `src/infrastructure/schema.ts` の invoices テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("invoices_org_contract_id_idx").on(table.organizationId, table.contractId)` が存在し、既存のカラム定義に変更がない

---

### TC-007: meetings テーブルに (organization_id, deal_id) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/schema.ts` の meetings テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバック（既存 check 制約を含む）の内容を参照する
**THEN** `index("meetings_org_deal_id_idx").on(table.organizationId, table.dealId)` が存在し、既存の check 制約に変更がない

---

### TC-008: meetings テーブルに (organization_id, inquiry_id) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `src/infrastructure/schema.ts` の meetings テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("meetings_org_inquiry_id_idx").on(table.organizationId, table.inquiryId)` が存在し、既存の check 制約に変更がない

---

### TC-009: approval_steps テーブルに request_id 単独インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** `src/infrastructure/schema.ts` の approvalSteps テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("approval_steps_request_id_idx").on(table.requestId)` が存在し（organization_id を含まない単独 FK インデックス）、既存のカラム定義に変更がない

---

### TC-010: client_contacts テーブルに client_id 単独インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `src/infrastructure/schema.ts` の clientContacts テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("client_contacts_client_id_idx").on(table.clientId)` が存在し（organization_id を含まない単独 FK インデックス）、既存のカラム定義に変更がない

---

### TC-011: requests テーブルに (organization_id, origin_trigger_entity_id) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `src/infrastructure/schema.ts` の requests テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバック（既存 check 制約を含む）の内容を参照する
**THEN** `index("requests_org_trigger_entity_id_idx").on(table.organizationId, table.originTriggerEntityId)` が存在し、既存の check 制約に変更がない

---

### TC-012: webhook_deliveries テーブルに endpoint_id 単独インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `src/infrastructure/schema.ts` の webhookDeliveries テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("webhook_deliveries_endpoint_id_idx").on(table.endpointId)` が存在し（organization_id を含まない単独 FK インデックス）、既存のカラム定義に変更がない

---

### TC-013: revenue_targets テーブルに (organization_id, period_start) 複合インデックスが定義される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** `src/infrastructure/schema.ts` の revenueTargets テーブル定義を確認する
**WHEN** pgTable の第 3 引数コールバックの内容を参照する
**THEN** `index("revenue_targets_org_period_start_idx").on(table.organizationId, table.periodStart)` が存在し、既存のカラム定義に変更がない

---

## Migration Generation

### TC-014: マイグレーションファイルの内容が CREATE INDEX のみである

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 差分マイグレーションはインデックス追加のみを含む > Scenario: マイグレーションファイルの内容検証

---

### TC-015: 差分マイグレーションが 1 本追加される

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** T-01〜T-09 のインデックス定義を schema.ts に全て追加した状態である
**WHEN** `bun run db:generate` を実行する
**THEN** drizzle/migrations ディレクトリに差分マイグレーションファイルが正確に 1 本追加される（手書きでない）

---

### TC-016: 生成された CREATE INDEX 文が合計 13 本である

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10

**GIVEN** `bun run db:generate` で差分マイグレーションを生成済みである
**WHEN** 生成された SQL ファイルの内容を確認する
**THEN** `CREATE INDEX` 文がちょうど 13 本含まれる（inquiries/deals/clients 各 1 本、contracts 2 本、invoices 1 本、meetings 2 本、approval_steps/client_contacts/requests/webhook_deliveries/revenue_targets 各 1 本）

---

## Integrity & Compatibility

### TC-017: deal_contacts テーブルには新規インデックスを追加しない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 既存のインデックス・制約と重複しない > Scenario: deal_contacts テーブルは新規インデックスを追加しない

---

### TC-018: drizzle-kit check が正常終了する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: drizzle-kit check が通る > Scenario: drizzle-kit check の成功

---

### TC-019: meetings テーブルの既存 check 制約が変更されない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** schema.ts の meetings テーブルに 2 本のインデックス定義を追加した後
**WHEN** meetings の pgTable 第 3 引数コールバック全体を確認する
**THEN** インデックス追加前に存在していた check 制約がそのまま保持されており、削除・変更されていない

---

### TC-020: requests テーブルの既存 check 制約が変更されない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** schema.ts の requests テーブルにインデックス定義を追加した後
**WHEN** requests の pgTable 第 3 引数コールバック全体を確認する
**THEN** インデックス追加前に存在していた check 制約がそのまま保持されており、削除・変更されていない

---

### TC-021: 既存インデックス保有テーブルに変更がない

**Category**: manual
**Priority**: should
**Source**: design.md > Context

**GIVEN** schema.ts を変更した後
**WHEN** action_items / audit_logs / approval_policies / approval_delegations / watches の各テーブル定義を確認する
**THEN** 既存の index 定義（org_done, meeting_id, deal_id, org_created_at, target_type_id, org_trigger_active, to_user_org_active, org_user 等）が変更・削除されていない

---

### TC-022: 追加インデックスの命名が既存命名規約に準拠する

**Category**: manual
**Priority**: should
**Source**: design.md > Goals / Non-Goals

**GIVEN** schema.ts に 13 本のインデックスを追加した後
**WHEN** 各インデックス名を確認する
**THEN** 全て `<table>_<columns>_idx` 形式に従い、organization_id は `org` と略記されており（例: `inquiries_org_created_at_idx`）、FK 単独インデックスは省略なし（例: `approval_steps_request_id_idx`）

---

## Quality Gates

### TC-023: 既存テスト・typecheck・build が全て成功する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 既存テスト・ビルドに影響しない > Scenario: 既存テストが無変更で通る

---

## Result

```yaml
result: completed
total: 23
automated: 2
manual: 21
must: 21
should: 2
could: 0
blocked_reasons: []
```
