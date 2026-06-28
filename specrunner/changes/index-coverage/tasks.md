# Tasks: index-coverage

## T-01: inquiries / deals / clients テーブルにテナント一覧用インデックスを追加

`src/infrastructure/schema.ts` で、inquiries / deals / clients の 3 テーブルに `(organization_id, created_at)` 複合インデックスを追加する。いずれも `findAllByOrganization` が `WHERE organization_id = ? ORDER BY created_at DESC` のパターンで使用する。

- [x] `inquiries` テーブル定義を第 3 引数のコールバック形式に変更し、`index("inquiries_org_created_at_idx").on(table.organizationId, table.createdAt)` を追加
- [x] `deals` テーブル定義を第 3 引数のコールバック形式に変更し、`index("deals_org_created_at_idx").on(table.organizationId, table.createdAt)` を追加
- [x] `clients` テーブル定義を第 3 引数のコールバック形式に変更し、`index("clients_org_created_at_idx").on(table.organizationId, table.createdAt)` を追加

**Acceptance Criteria**:
- 各テーブルの pgTable 定義に第 3 引数（コールバック）が追加され、index 定義が含まれる
- 既存のテーブル定義（カラム、リレーション）に変更がない
- TypeScript コンパイルが通る（`bun run typecheck`）

## T-02: contracts テーブルに FK 複合インデックスを追加

`src/infrastructure/schema.ts` で、contracts テーブルに 2 本の複合インデックスを追加する。

- [x] `index("contracts_org_deal_id_idx").on(table.organizationId, table.dealId)` を追加（`findAllByDealId` 用）
- [x] `index("contracts_org_client_id_idx").on(table.organizationId, table.clientId)` を追加（`findAllByClientId` 用）

**Acceptance Criteria**:
- contracts テーブルの pgTable 定義に第 3 引数（コールバック）が追加され、2 本の index 定義が含まれる
- 既存のテーブル定義に変更がない

## T-03: invoices テーブルに FK 複合インデックスを追加

`src/infrastructure/schema.ts` で、invoices テーブルに `(organization_id, contract_id)` 複合インデックスを追加する。

- [x] `invoices` テーブル定義を第 3 引数のコールバック形式に変更し、`index("invoices_org_contract_id_idx").on(table.organizationId, table.contractId)` を追加（`findAllByContract` / `sumAmountByContract` 用）

**Acceptance Criteria**:
- invoices テーブルの pgTable 定義に index 定義が含まれる
- 既存のテーブル定義に変更がない

## T-04: meetings テーブルに FK 複合インデックスを追加

`src/infrastructure/schema.ts` で、meetings テーブルに 2 本の複合インデックスを追加する。meetings テーブルは既に第 3 引数（check 制約）を持つため、既存の配列に追加する。

- [x] `index("meetings_org_deal_id_idx").on(table.organizationId, table.dealId)` を追加（`findAllByDeal` 用）
- [x] `index("meetings_org_inquiry_id_idx").on(table.organizationId, table.inquiryId)` を追加（`findAllByInquiry` 用）

**Acceptance Criteria**:
- meetings テーブルの既存 check 制約の隣に 2 本の index 定義が追加される
- 既存の check 制約に変更がない

## T-05: approval_steps テーブルに FK 単独インデックスを追加

`src/infrastructure/schema.ts` で、approval_steps テーブルに `(request_id)` 単独インデックスを追加する。`findByRequestId` / `resetSteps` / `findOverdueRequestIds` のいずれも request_id で絞り込むが、organization_id 条件を伴わない経路（`findOverdueRequestIds`）が存在するため FK 単独とする。

- [x] `approvalSteps` テーブル定義を第 3 引数のコールバック形式に変更し、`index("approval_steps_request_id_idx").on(table.requestId)` を追加

**Acceptance Criteria**:
- approval_steps テーブルの pgTable 定義に index 定義が含まれる
- 既存のテーブル定義に変更がない

## T-06: client_contacts テーブルに FK 単独インデックスを追加

`src/infrastructure/schema.ts` で、client_contacts テーブルに `(client_id)` 単独インデックスを追加する。`findContactsByClientId` / `countContactsByClientIds` / `findAllContactsByOrganization` はいずれも client_id での JOIN/WHERE を使用する。

- [x] `clientContacts` テーブル定義を第 3 引数のコールバック形式に変更し、`index("client_contacts_client_id_idx").on(table.clientId)` を追加

**Acceptance Criteria**:
- client_contacts テーブルの pgTable 定義に index 定義が含まれる
- 既存のテーブル定義に変更がない

## T-07: requests テーブルに複合インデックスを追加

`src/infrastructure/schema.ts` で、requests テーブルに `(organization_id, origin_trigger_entity_id)` 複合インデックスを追加する。requests テーブルは既に第 3 引数（check 制約）を持つため、既存の配列に追加する。

- [x] `index("requests_org_trigger_entity_id_idx").on(table.organizationId, table.originTriggerEntityId)` を追加（`findByOriginTriggerEntity` / `existsPendingByTriggerEntityId` 用）

**Acceptance Criteria**:
- requests テーブルの既存 check 制約の隣に index 定義が追加される
- 既存の check 制約に変更がない

## T-08: webhook_deliveries テーブルに FK 単独インデックスを追加

`src/infrastructure/schema.ts` で、webhook_deliveries テーブルに `(endpoint_id)` 単独インデックスを追加する。

- [x] `webhookDeliveries` テーブル定義を第 3 引数のコールバック形式に変更し、`index("webhook_deliveries_endpoint_id_idx").on(table.endpointId)` を追加（`findByEndpointId` / `findLatestByEndpointIds` 用）

**Acceptance Criteria**:
- webhook_deliveries テーブルの pgTable 定義に index 定義が含まれる
- 既存のテーブル定義に変更がない

## T-09: revenue_targets テーブルに複合インデックスを追加

`src/infrastructure/schema.ts` で、revenue_targets テーブルに `(organization_id, period_start)` 複合インデックスを追加する。`findByOrganization` の `ORDER BY period_start ASC` と `findByPeriod` / `findOverlapping` の `period_start` 範囲検索を両方カバーする。

- [x] `revenueTargets` テーブル定義を第 3 引数のコールバック形式に変更し、`index("revenue_targets_org_period_start_idx").on(table.organizationId, table.periodStart)` を追加

**Acceptance Criteria**:
- revenue_targets テーブルの pgTable 定義に index 定義が含まれる
- 既存のテーブル定義に変更がない

## T-10: 差分マイグレーション生成と検証

T-01〜T-09 のインデックス定義を全て追加した状態で、差分マイグレーションを生成し検証する。

- [x] `bun run db:generate` を実行し、差分マイグレーション SQL を 1 本生成する
- [x] 生成された SQL ファイルが `CREATE INDEX` 文のみを含むことを確認する（`CREATE TABLE` / `ALTER TABLE ... ADD COLUMN` / `DROP` / `INSERT` / `UPDATE` / `DELETE` が含まれていないこと）
- [x] 生成されたインデックスが 13 本であることを確認する
- [x] `bunx drizzle-kit check` を実行し、journal / snapshot 整合が正常であることを確認する
- [x] `bun run typecheck` が成功することを確認する
- [x] `bun run build` が成功することを確認する
- [x] `bun test` が既存テスト無変更で成功することを確認する

**Acceptance Criteria**:
- 差分マイグレーションファイルが 1 本追加されている
- マイグレーション内容が CREATE INDEX 文 13 本のみである
- `drizzle-kit check` / `typecheck` / `build` / `test` が全て成功する
