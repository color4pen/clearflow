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
| 1 | high | testing | `src/__tests__/usecases/pipelineSummary.test.ts` (テスト追加) | **TC-011 未実装（must）**: 受け入れ基準に「activePhases に hearing を含み passed を除外することをテストで固定」と明記されているが、`revenueRepository.ts` の `activePhases` を検証するテストが存在しない。`pipelineSummary.test.ts` は `getPipelineSummary.ts` の `ALL_PHASES` のみを対象とし、売上/パイプライン集計に使う `activePhases` の絞り込みは対象外。将来 `hearing` が脱落・`passed` が混入しても silent になる。 | `pipelineSummary.test.ts` に静的解析テストを追加する。`revenueRepository.ts` を読み込み、`activePhases` の定義に `"hearing"` が含まれ `"passed"` が含まれないことを assert する。 | yes |
| 2 | medium | architecture | `drizzle/0021_silky_shinko_yamashiro.sql` | **D1・T-02 違反 — マイグレーション方式が設計決定と不一致**: `design.md` D1 は型再作成パターン（DROP DEFAULT → CREATE TYPE new → ALTER COLUMN USING CAST → SET DEFAULT → DROP TYPE old → RENAME）を採用決定し `ALTER TYPE ADD VALUE` を明示的に不採用とした。`tasks.md` T-02 も再作成パターンの 6 ステップを列挙・チェック済みとしているが、実際の SQL は `ADD VALUE` 方式である（Drizzle の `db:generate` 出力のまま）。リポジトリ前例 `0018_interaction_kind_channel.sql` とパターンが乖離する。 | `0021_*.sql` を手書きの型再作成 SQL に書き換える（`0018` と同じステップ構成）。`meta/0021_snapshot.json` と `_journal.json` はスキーマの最終形が正しいため変更不要。 | yes |
| 3 | medium | testing | `src/__tests__/mcp/mcpAuthorization.test.ts` (テスト追加) | **TC-015 未実装（must）**: 受け入れ基準に「passed が closePhase 権限で終端扱いされることをテストで固定」と明記されているが、`mcp/tools/deals.ts` の `isTerminalPhase` に `passed` が含まれることを検証するテストが存在しない。TC-019-deals は `newPhase` enum の値列を確認するのみで、`isTerminalPhase` → `closePhase` の経路は未検証。 | `mcpAuthorization.test.ts` に静的解析テストを追加する。`mcp/tools/deals.ts` の `update_phase` ブロックを読み込み、`"passed"` と `closePhase` が共に含まれることを assert する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 7 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.30

## Summary

全体的な実装品質は高い。DealPhase 型・状態機械・イベント発火・Webhook ハンドラ・MCP スキーマ・UI（ステッパー/バッジ/フィルタ/グリッド）・aozu 設計層のすべてが漏れなく更新されており、1942 テスト全件グリーン、typecheck/lint/build もすべてクリアしている。

Fix が必要な点は 3 つ。

**F-1（high）**: `revenueRepository.ts` の `activePhases` を検証するテストがなく、受け入れ基準「activePhases に hearing を含み passed を除外することをテストで固定」が未達成。

**F-2（medium）**: マイグレーション SQL が `ALTER TYPE ADD VALUE` 方式であり、設計決定 D1・タスク T-02 の型再作成パターンと一致しない。実環境（Neon / PostgreSQL 14+）では動作すると推測されるが、リポジトリの precedent（0018）および明文化された設計根拠との乖離は修正すべきである。

**F-3（medium）**: MCP `update_phase` の `isTerminalPhase` に `passed` が含まれることを検証するテストがなく、受け入れ基準「passed が closePhase 権限で終端扱いされることをテストで固定」が未達成。

いずれも静的コード解析テストの追加（F-1・F-3）または SQL の書き換え（F-2）で解決できる。ロジック上の欠陥や silent-drop は確認されていない。
