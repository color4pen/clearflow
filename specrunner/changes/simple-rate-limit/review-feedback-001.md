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

- **verdict**: needs-fix
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | high | correctness | `drizzle/` (missing) | `rate_limit_records` テーブルが `schema.ts` に追加されているが、対応する Drizzle マイグレーション SQL ファイルが作成されていない。プロジェクトは `drizzle/0001_*.sql` 〜 `0004_*.sql` の連番マイグレーションを採用しており、全テーブルに対応 SQL が存在する。本ファイルが欠落した状態でデプロイすると既存 DB に `rate_limit_records` テーブルが存在せず、`checkRateLimit` 呼び出し時に PostgreSQL エラー "relation 'rate_limit_records' does not exist" が発生し、全レート制限対象 Action が実行不能になる | `drizzle-kit generate` を実行して `drizzle/0005_rate_limit_records.sql` を生成し、`drizzle/meta/` の snapshot と `_journal.json` も更新する。手動作成する場合は `CREATE TABLE "rate_limit_records" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "key" text NOT NULL, "count" integer NOT NULL, "window_start" timestamp NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL); ALTER TABLE "rate_limit_records" ADD CONSTRAINT "rate_limit_records_key_unique" UNIQUE("key");` | yes |
| 2 | low | maintainability | `src/infrastructure/repositories/userRepository.ts` | 本 PR のスコープ外である `userRepository.ts` が変更されている（17 行削除）。重複していた旧 `findByOrganization` 実装を削除したもので、変更内容自体は正しく（ビルドも通過）、結果的にコードを改善している。ただし rate-limit の要件仕様・タスクには `userRepository.ts` への変更は記載されていない | コードの変更内容は正しいため fix 不要。将来は同一 PR に無関係な cleanup を混在させないよう注意する | no |
| 3 | low | testing | `src/__tests__/infrastructure/rateLimit.test.ts` | test-cases.md で TC-002〜TC-005 が `integration` カテゴリ `must` 優先度として分類されているが（初回リクエスト許可・limit 内許可・超過拒否・ウィンドウリセット）、実際のテストはソースコード静的解析のみで実装されており、実際の DB に対して `checkRateLimit` の SQL 動作を検証するテストが存在しない。`bun test` コマンド自体が package.json に存在せず `skipped` になっている点も確認済み | CI 上で DB が利用できない場合はテスト戦略のドキュメントに「動的統合テストは DB 環境構築後に追加」と明記する。`bun test` スクリプトを package.json に追加することで静的テスト群は実行可能になる | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.00

## Summary

実装の論理構造は仕様を正確に満たしている。`checkRateLimit` の `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` による原子的 upsert は設計通りに実装されており、TOCTOU 脆弱性はない。全 Server Action への配置順序（冪等キーチェック後・usecase 前）も正しく、`actions → infrastructure` の依存方向も維持されている。ビルド・lint は通過。

**唯一の blocking 所見は Drizzle マイグレーションファイルの欠落**（Finding #1）。`schema.ts` に `rateLimitRecords` テーブルが定義されているが、`drizzle/0005_*.sql` が存在しない。本プロジェクトは git 管理の連番マイグレーションを採用しており、このファイルがなければ既存 DB にテーブルが作成されず、デプロイ後に全レート制限対象 Action が即時エラーになる。`drizzle-kit generate` で生成・コミットすることで解消できる。

低優先度所見として、`userRepository.ts` のスコープ外変更（pre-existing 重複削除、内容は正しい）と、動的 DB 統合テストの欠如（静的解析で代替中）を記録した。前者は fix 不要、後者は環境制約に起因するため次フェーズ対応でよい。
