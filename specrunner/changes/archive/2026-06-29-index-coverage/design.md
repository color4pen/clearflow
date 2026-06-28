# Design: index-coverage

## Context

全テナント分離クエリが `organization_id` を WHERE 先頭に置くが、コア業務テーブル（inquiries / deals / contracts / invoices / meetings / clients / requests / revenue_targets）と親子取得用テーブル（approval_steps / client_contacts / webhook_deliveries）にインデックスが存在しない。PostgreSQL は FK 列を自動インデックスしないため、データ増加に伴い Seq Scan がボトルネックになるリスクがある。

既にインデックスを持つテーブル: action_items（org_done, meeting_id, deal_id）、audit_logs（org_created_at, target_type_id）、approval_policies（org_trigger_active）、approval_delegations（to_user_org_active）、watches（org_user）。

変更対象は `src/infrastructure/schema.ts` の `index()` 定義のみ。差分マイグレーションは `bun run db:generate` で生成する。

## Goals / Non-Goals

**Goals**:

- 実クエリに対応するインデックスを 11 テーブル・計 13 本追加し、テナント分離クエリと FK 結合の Seq Scan を解消する
- 既存の命名規約（`<table>_<columns>_idx`、organization_id は `org` と略記）に準拠する
- `bun run db:generate` による差分マイグレーション 1 本を生成する（手書きしない）

**Non-Goals**:

- クエリ自体の書き換え・最適化
- 既存インデックスの削除・変更
- パーティショニング等の物理設計変更
- データモデル設計書への反映

## Decisions

### D1: 複合インデックスの先頭列は organization_id

全一覧クエリが `WHERE organization_id = ? ORDER BY created_at DESC` の形をとるため、`(organization_id, created_at)` の複合インデックスで等値フィルタ + 整列の両方をカバーする。FK 絞り込みも `(organization_id, <fk_column>)` で同様。

- **Rationale**: organization_id 単独インデックスでは ORDER BY のファイルソートが残る。複合にすることで Index Scan のみで結果を返せる。
- **Alternatives considered**: 各列の単独インデックス — 等値条件は効くが整列は別途ソートが必要。複合の方がクエリプランが効率的。

### D2: FK 単独インデックスは organization_id 条件を伴わない経路に限定

`approval_steps(request_id)` / `client_contacts(client_id)` / `webhook_deliveries(endpoint_id)` は親テーブルからの直接取得が主経路であり、organization_id での絞り込みを伴わないクエリパスが存在する（例: `findOverdueRequestIds` は status + deadline で全テナント横断検索する）。これらは FK 単独インデックスとする。

- **Rationale**: organization_id を含めると、org 条件なしのクエリでインデックスが使われない。FK 単独の方が汎用性が高い。
- **Alternatives considered**: `(organization_id, request_id)` 複合 — org 条件なしのクエリに効かないため不採用。

### D3: deal_contacts には新規インデックス不要

`deal_contacts` テーブルは `UNIQUE(deal_id, contact_id)` 制約を持ち、この UNIQUE インデックスが `deal_id` 先頭の B-tree として機能するため、`deal_id` 単独インデックスと同等のルックアップ性能を提供する。重複を避けるため新規インデックスは追加しない。

- **Rationale**: PostgreSQL の UNIQUE 制約は内部的に B-tree インデックスを作成するため、先頭列での等値検索はカバーされる。
- **Alternatives considered**: `deal_id` 単独インデックスの追加 — UNIQUE と機能重複するため不採用。

### D4: マイグレーション生成は db:generate 一発

schema.ts に全 13 本のインデックスを定義してから `bun run db:generate` を 1 回実行し、1 本の差分マイグレーションファイルを生成する。手書きマイグレーションは使わない。

- **Rationale**: プロジェクト規約（db:generate 経由のみ）に準拠。1 回の generate で全インデックスをまとめることで、マイグレーション管理が単純になる。
- **Alternatives considered**: テーブルごとに個別マイグレーション — 管理が煩雑になるため不採用。

## Risks / Trade-offs

- **[Risk] インデックス追加によるテーブルロック** → PostgreSQL の `CREATE INDEX` はデフォルトでテーブルに SHARE ロックを取る。データ規模が小さい現段階では影響は軽微。大規模データがある場合は `CONCURRENTLY` オプションが必要だが、drizzle-kit の生成マイグレーションではサポートされないため、必要になった時点で手動対応する。
- **[Risk] 書き込みオーバーヘッド** → 13 本のインデックス追加により INSERT/UPDATE の書き込みコストが増加する。ただし全テーブルとも read-heavy なアクセスパターンであり、インデックスによる読み取り性能の改善が書き込みコストを上回る。

## Open Questions

なし。architect 評価済みの設計判断に沿った実装であり、未解決事項はない。
