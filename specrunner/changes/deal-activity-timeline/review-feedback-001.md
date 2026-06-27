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
| 1 | medium | testing | `src/__tests__/lib/activityConfig.test.ts` | T-11 の実装はタイプ確認のみ（型と定数値のチェック）。test-cases.md TC-026〜TC-031（must 優先度）で要求されている env 変数操作を伴う振る舞いテスト（`getHiddenActions()` のカンマ分割・trim 動作、`isActivityFeedEnabled()` の "true"/"false"/未設定の各ケース）が未実装。受け入れ基準「ACTIVITY_HIDDEN_ACTIONS で指定した action がタイムラインに含まれないことをテストで確認する」を完全には満たしていない。 | `process.env.ACTIVITY_HIDDEN_ACTIONS` を各テストケースで上書きして振る舞いをアサートするユニットテストを追加する。例: `process.env.ACTIVITY_HIDDEN_ACTIONS = "deal.view,meeting.view"` → `["deal.view", "meeting.view"]` を返すこと、trim が機能すること、`isActivityFeedEnabled` が "true"/"false"/undefined で正しい boolean を返すことを確認する。 | no |
| 2 | low | maintainability | `src/app/(dashboard)/deals/[id]/DealActivitySection.tsx` | アクティビティ行の表示テキストが `{actorName} が {targetLabel} を {actionLabel}` というフォーマットになっており、actionLabel（例: "案件を更新"）の中にすでにエンティティ名が含まれているため "John が 案件 を 案件を更新" のように重複した表現になる。 | actionLabel をそのまま表示し targetLabel を補助情報として括弧書き等で表示するか、actionLabel のマッピングを動詞のみ（"更新"）に変更してフォーマットを `{actor} が {targetLabel} を {verb} した` に統一する。ただし表示要素はすべて spec 通り揃っているため機能上の問題はない。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.95

## Summary

実装全体として高品質。受け入れ基準 7 項目をすべて満たし、build・typecheck・test（1102件 all pass）・lint がグリーン。

**良好な点**:
- `findByTargets` は organizationId を必ず AND 条件に含めており、テナント分離が確実。`targets` が空配列の場合のアーリーリターンも正しい。
- `getDealActivity` は案件自身＋配下 4 種（meeting/contract/actionItem/dealContact）を `Promise.all` で並列取得しており、N+1 を回避している。
- `activityEnabled ? getDealActivity(...) : Promise.resolve([])` のパターンにより、フラグ OFF 時は DB クエリを一切発行しない。
- `lib/activityConfig.ts` と `lib/activityLabels.ts` を `src/lib/` に分離したことで、表示ロジックが UI 層から独立している。依存方向（actions/RSC → usecases → repositories + lib）は遵守されている。
- `getHiddenActions()` の `.filter(Boolean)` により空文字列エントリを除去するガードが入っている。
- 差分マイグレーション SQL が `CREATE INDEX` のみ（既存データ・カラム変更なし）で要件通り。

**指摘事項**:
1. **medium / testing**: `activityConfig.test.ts` が型・定数値チェックに留まり、env 変数操作を伴う振る舞いテスト（TC-026〜TC-031）が未実装。tasks.md T-11 のスコープは型チェックのみだが、test-cases.md では must 優先度の振る舞いテストが複数定義されている。今後の反復でカバー推奨。
2. **low / maintainability**: `{actor} が {targetLabel} を {actionLabel}` のフォーマットでは actionLabel に目的語が内包されているため重複表現になるケースがある（UX 上の軽微な問題。機能要件自体は満たしている）。
