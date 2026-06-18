# Code Review Feedback — iteration 002

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
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | `src/__tests__/infrastructure/rateLimit.test.ts` | TC-002〜TC-005（初回リクエスト許可・limit 内許可・超過拒否・ウィンドウリセット）の動的 DB 統合テストが引き続き静的解析で代替されている。`bun test` スクリプトが package.json に存在せず verification では skipped。iteration 001 から継続する環境制約に起因する既知の制限 | CI に DB 環境が整備された段階で `checkRateLimit` の実動作を検証する統合テストを追加する。現時点では静的解析で仕様適合を検証済みのため blocking しない | no |
| 2 | low | maintainability | `src/infrastructure/repositories/userRepository.ts` | スコープ外の 17 行削除が引き続き含まれている。iteration 001 で記録済みの pre-existing cleanup。変更内容は正しく、ビルド・lint を通過している | 変更内容は正しいため fix 不要。将来は無関係な cleanup を同一 PR に混在させないよう注意する | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.60

## Summary

iteration 001 の唯一の blocking 所見（`high` — Drizzle マイグレーションファイルの欠落）が `drizzle/0005_rate_limit_records.sql`、`drizzle/meta/0005_snapshot.json`、`drizzle/meta/_journal.json` の追加によって完全に解消された。

### 実装検証結果

**スキーマ（T-01）**: `rateLimitRecords` テーブルが `schema.ts` に正しく定義されている。`key` に `.unique()` 制約、`count` は integer NOT NULL、`windowStart` は timestamp NOT NULL。FK なし。マイグレーション SQL も同等の UNIQUE 制約を定義している。

**`checkRateLimit` 関数（T-02）**: `INSERT ... ON CONFLICT (key) DO UPDATE ... RETURNING count` による原子的 upsert が正確に実装されている。`threshold` はサーバーサイドで `new Date(Date.now() - params.windowMs)` として計算され、CASE WHEN で既存ウィンドウの有効性を判定している。SQL 内の `window_start` と `count` は PostgreSQL の ON CONFLICT DO UPDATE コンテキストにおいて既存行の値を正しく参照する。`allowed: count <= params.limit`、`remaining: Math.max(0, params.limit - count)` の判定も仕様通り。

**`requests.ts`（T-03, T-04）**: `createRequestAction` はauth チェック直後・バリデーション前にレート制限チェックを配置。`submitRequestAction`・`approveRequestAction`・`rejectRequestAction`・`resubmitRequestAction` の 4 Action はいずれも冪等キーチェック（`findByKey` → キャッシュヒット早期リターン）の後、usecase 呼び出し前にレート制限チェックを配置している。キーは `approveReject:${session.user.id}` で統一。全 Action の超過メッセージが仕様通り統一されている。

**`webhooks.ts`（T-05）**: 書き込み系 4 Action（create / delete / toggle / retry）は認証 + ロールチェック直後にレート制限チェックを配置。読み取り系 2 Action（list endpoints / list deliveries）にはレート制限なし。設計通り。

**テスト（T-06）**: 静的解析テストが全 must TC（スキーマ・関数実装・Action 統合・配置順序・依存方向・メッセージ統一）をカバーしている。依存方向テスト（usecase 層が `rateLimit` を import しないこと）も含む。

**依存方向**: `actions → infrastructure` を維持。usecase 層は `rateLimit` を参照しない。

残存する所見はいずれも `low / no fix` であり、blocking 条件を満たさない。承認。
