# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | `src/__tests__/usecases/optimisticLock.test.ts` | TC-001〜TC-008（"unit"カテゴリで must）はベース受け入れ基準（version 不一致で拒否・一致で成功＋インクリメント）を記述しているが、追加されたテストは全て静的コード解析（ソース文字列一致）のみ。実際の楽観的ロック動作（DB クエリが version の WHERE 条件を持つか、返却値が null かどうか）は実行時に確認されない。ただし tasks.md T-09 が「既存の静的解析パターンに従う」と明示しており、contracts/invoices の楽観的ロックも同一手法で実装済み。プロジェクト方針との整合性は取れているため blocking にはしない。 | 今後 DB 統合テスト環境が整備された際に TC-001〜TC-008 の behavioral test を追加することを推奨する。現時点では既存パターン踏襲として許容。 | no |
| 2 | low | maintainability | `drizzle/meta/_journal.json` | `0008_migrate_action_items_data.sql` が drizzle/ に存在するが _journal.json に対応エントリがなく（idx 8 が `0009_contract_invoice_version` を指す）、ファイル名と idx の対応が不一致。本 PR 以前から存在する問題で、このブランチで新規導入した問題ではない。 | 既存問題として別 issue で追跡することを推奨。本 PR のスコープ外。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.95

## Summary

ADR-005 で確立された楽観的ロックパターンを meetings / action_items / revenue_targets の 3 エンティティへ正確に横展開できている。

**正しく実装された点（全受け入れ基準を満足）:**

- **マイグレーション**: `0010_remaining_entity_version.sql` が 3 テーブルの `ALTER TABLE ... ADD COLUMN "version" integer DEFAULT 1 NOT NULL` を statement-breakpoint 区切りで含む。差分マイグレーションであり DB リセット不要。`_journal.json` に idx=9 エントリが正しく追加されている。
- **ドメインモデル**: `Meeting` / `ActionItem` / `RevenueTarget` 型すべてに `version: number` が追加されている。
- **リポジトリ mapRow**: 3 リポジトリすべてで `version: row.version` が返却オブジェクトに含まれる。
- **リポジトリ update シグネチャ**: 3 リポジトリすべてで `expectedVersion: number` パラメータが `data` の後に配置されている（既存シグネチャとの一貫性 ✓）。
- **楽観的ロック WHERE / SET**: `eq(<table>.version, expectedVersion)` が WHERE に、`version: sql\`version + 1\`` が SET に含まれる（3 リポジトリとも）。
- **usecase 統合**: 4 usecase すべてが `findById` で取得した `existing.version` を `update` に渡し、null 返却時に `{ ok: false, reason: "この<対象>は他のユーザーによって更新されました。画面を更新してください" }` を返す。
- **updateRevenueTarget の auditLog スキップ**: version 不一致（result が null）の場合、`auditLogRepository.create` より前に `return null` しており、ロック失敗時に監査ログが記録されない（TC-024 ✓）。
- **依存方向**: actions → usecases → domain / infrastructure の方向を遵守。
- **検証結果**: build / typecheck / test (1051 pass, 0 fail) / lint すべて green。

**判断すべき観察事項:**

TC-001〜TC-008 は test-cases.md で "unit / automated / must" として定義されているが、実装は静的コード解析に留まる。これは tasks.md T-09 の方針に従った意図的な選択であり、contracts/invoices の先行実装と同一手法である。現状では blocking としないが、将来的に統合テスト環境が整備された際に behavioral tests への昇格を検討することを推奨する。
