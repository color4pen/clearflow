# 主要テーブルのインデックス整備

## Meta

- **type**: spec-change
- **slug**: index-coverage
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 既存の index 付与パターン（schema.ts の index() ＋ db:generate 差分マイグレーション）に沿って、クエリパターンに対応する index を追加するだけ。新しい port/adapter・設計選択は無いため false -->

## 背景

本システムは全クエリが `organization_id` でテナント分離されるが、その絞り込みや外部キー結合を支えるインデックスが一部のテーブル（action_items / audit_logs / approval_policies / approval_delegations / watches）にしか無い。PostgreSQL は外部キー列を自動インデックスしないため、コア業務テーブル（deals / inquiries / contracts / invoices / meetings 等）の `organization_id` や FK 列での絞り込みが Seq Scan になる。現状はデータ規模が小さく実害は小さいが、データ増加に備え、実クエリに対応する index を整備する。差分マイグレーションのみ・既存データに触らない。

## 現状コードの前提

- src/infrastructure/schema.ts — index を持つのは action_items / audit_logs / approval_policies / approval_delegations / watches のみ。以下は `organization_id` や FK の index を持たない: inquiries / deals / contracts / invoices / meetings / clients / approval_steps / client_contacts / requests / webhook_deliveries / revenue_targets
- リポジトリの主なクエリ（src/infrastructure/repositories/*.ts）はいずれも `organization_id` を WHERE 先頭に置き、一覧は createdAt desc で整列、子の取得は FK（deal_id / contract_id / inquiry_id / request_id / endpoint_id / client_id）で絞る
- index 追加は schema.ts の `index()` 定義 ＋ `bun run db:generate` の差分マイグレーションで行う（既存ルール: マイグレーションは generate 経由・手書きしない）

## 要件

実クエリに対応する以下のインデックスを schema.ts に追加し、`bun run db:generate` で差分マイグレーションを生成する（既存データに触らない）。

1. inquiries: `(organization_id, created_at)`
2. deals: `(organization_id, created_at)`
3. contracts: `(organization_id, deal_id)` と `(organization_id, client_id)`
4. invoices: `(organization_id, contract_id)`
5. meetings: `(organization_id, deal_id)` と `(organization_id, inquiry_id)`
6. clients: `(organization_id, created_at)`
7. approval_steps: `(request_id)`
8. client_contacts: `(client_id)`
9. requests: `(organization_id, origin_trigger_entity_id)`
10. webhook_deliveries: `(endpoint_id)`
11. revenue_targets: `(organization_id, period_start)`

- index 名は既存の命名規約（`<table>_<columns>_idx`）に合わせる。
- 既存の index・UNIQUE 制約と重複しないこと（例: deal_contacts(deal_id, contact_id) UNIQUE が deal_id を兼ねる箇所は新設不要）。

## スコープ外

- クエリ自体の書き換え・最適化（index 追加のみ）
- 既存 index の削除・変更
- パーティショニング等の大規模な物理設計
- データモデル設計書（06）への index 記載（ドキュメント反映は別途）

## 受け入れ基準

- [ ] 上記テーブルに対応する index が schema.ts に定義され、`bun run db:generate` 由来の差分マイグレーションが1本追加される（手書きでない）
- [ ] 生成マイグレーションが index 追加のみ（テーブル/カラム変更を含まない）であることを確認できる
- [ ] `drizzle-kit check` が通る（journal/snapshot 整合）
- [ ] 既存 index・制約と重複しない
- [ ] 既存テスト無変更で `bun test` green、`typecheck` green、`bun run build` 成功

## architect 評価済みの設計判断

1. **複合 index は (organization_id, <FK/整列キー>)** — 全クエリがテナント分離で organization_id を先頭条件に置くため、organization_id を先頭にした複合 index を基本とする。一覧の createdAt desc 整列も複合に含めて index 順で取得できるようにする。
2. **FK 単独 index は親子取得用** — approval_steps(request_id) / client_contacts(client_id) / webhook_deliveries(endpoint_id) は親からの取得が主で organization_id 条件を伴わない経路があるため FK 単独で張る。
3. **差分マイグレーションのみ・既存データ不可侵** — index 追加は ALTER のみでデータに触れない。db:generate で生成し、適用（db:migrate）は別途運用で行う。
