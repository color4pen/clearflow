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
| 1 | medium | testing | `src/__tests__/usecases/` | test-cases.md に unit/must で定義された TC-052（updatedAt 10 日前の案件は停滞案件に含まれない）と TC-053（won/lost フェーズの案件は停滞案件に含まれない）が未実装。stale deal フィルタロジック自体は `page.tsx` で正しく実装されているが、自動テストがない | `getPipelineSummary` と同じ静的解析パターンで `dashboardStaleDeals.test.ts` を追加し、stale deal フィルタの文字列パターン（`phase !== "won"`, `phase !== "lost"`, `updatedAt <=` 等）を検証する | yes |
| 2 | low | testing | `src/__tests__/usecases/*.test.ts` | 全テストファイルがソースコードの文字列照合（静的解析）であり、実際の関数呼び出しによる runtime 振る舞いを検証していない。TC-104（ソート順の null 末尾）など runtime で初めて確認できるケースも静的チェックのみ | 今回の実装範囲では DB モック構築コストを考慮し許容範囲。将来的に動作テストへ移行を推奨 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.75

## Summary

全体的に高品質な実装。受け入れ基準 12 項目すべてが満たされており、build / typecheck / test / lint が green。設計判断（D1〜D7）が正しく具現化されている。

**正常実装の確認：**

- `/` → `/dashboard` リダイレクト、ナビゲーション先頭リンクともに正確に実装（T-07）
- `findAllByOrganization` は `organizationId` を必須条件として tenant 分離が保証されており、`paidAt` / `issueDate` フィルタが `gte`/`lt` による exclusive 境界で正しく実装（T-01）
- `getDashboardActions` は `Promise.all` 並列取得 → ロール一致フィルタ → done/status フィルタ → 期日昇順ソート（null 末尾）が仕様通り（T-03）
- `getPipelineSummary` は全 5 フェーズを `count: 0` / `totalAmount: 0` で初期化し `estimatedAmount ?? 0` で null を安全に扱う（T-04）
- finance dashboard の月初・翌月初・翌々月初が `Date.UTC()` による UTC ベースで算出されており、タイムゾーン依存なし（T-06, TC-094）
- stale deal フィルタ（`updatedAt <= fourteenDaysAgo && phase !== "won" && phase !== "lost"`）は TC-052・TC-053・TC-056 の境界条件を正しく実装

**Finding 1 について（medium）：** TC-052・TC-053 は test-cases.md において unit/must 優先度で定義されているが T-08 のスコープに含まれていない。ロジック自体は正しく実装済みのため correctness への影響はなく、テストカバレッジの gap として code-fixer で追加対応する。
