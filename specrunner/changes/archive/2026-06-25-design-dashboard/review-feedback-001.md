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
| 1 | medium | testing | `src/app/(dashboard)/dashboard/SalesDashboard.tsx` | test-cases.md で must 優先度の純粋関数ユニットテスト (TC-009: `formatRelativeTime`、TC-016: pipeline 合計 reduce) が未実装。25 件の automated テストが計画されたが 0 件も追加されておらず、新規ロジックへのテストカバレッジがない | `src/__tests__/dashboard/` に `formatRelativeTime.test.ts` を作成し TC-009 (30分前→「30分前」)・TC-014 (たった今)・TC-015 (○時間前) をカバーする純粋関数テストを追加する。pipeline reduce 算出 (TC-016) も同ファイルまたは別ファイルで追加する | yes |
| 2 | low | correctness | `src/app/(dashboard)/dashboard/SalesDashboard.tsx` (L129) | パイプラインサマリの 5 番目フェーズセル（idx=4）に `border-r` が付与されない。条件 `idx < pipelineSummary.length - 1` が最後のフェーズセルを除外するため、5 番目フェーズと合計セルの間に境界線が欠落する | 条件を `idx < pipelineSummary.length`（全フェーズセルに border-r を付与）に変更する。合計セルは別要素のため影響なし | yes |
| 3 | low | correctness | `src/app/(dashboard)/dashboard/SalesDashboard.tsx` (L99) / `page.tsx` (L74) | `subtitle` が日付のみ表示（要件 R1「日付 + ロール」に未達）。`page.tsx` の `userRole` が `SalesDashboard` に渡されていないため、TC-020 の期待値 `"2026/06/25 | 営業"` 形式のサブテキストを実現できない | `SalesDashboard` の Props に `role: string` を追加し `page.tsx` から `userRole` を渡す。`subtitle={${today} | ${roleLabel}}` 形式（`roleLabel` は `userRole` の日本語ラベル）に変更する | yes |
| 4 | low | maintainability | `src/app/(dashboard)/dashboard/SalesDashboard.tsx` (L181) | アクション待ちリストのループで `key={idx}` （配列インデックス）を使用。`DashboardActionItem` は型別ユニーク ID (`requestId` / `dealId` / `inquiryId`) を持つため、インデックスキーは不要 | `key={item.type === "approval" ? item.requestId : item.type === "action_item" ? item.dealId : item.inquiryId}` に変更し、安定した React key を使用する | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 10 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 7 | 0.10 |
| testing | 3 | 0.10 |

- **total**: 7.85

## Summary

UI レイアウト変更の実装品質は全体的に良好。`DashboardHeader` の共通コンポーネント化、flex/grid への置換、超過判定ロジックの分離など、設計判断に忠実な実装が確認できる。build・typecheck・lint もすべて green。

主な懸念点は **テストカバレッジの欠如**。test-cases.md で定義された 25 件の automated テスト（うち must 優先度 13 件）が 1 件も実装されていない。特に `formatRelativeTime`（TC-009 / must）と pipeline 合計算出（TC-016 / must）は純粋関数であり、プロジェクトの既存テストパターン（`bun test` + 静的解析）で容易に追加可能なため、次イテレーションでの対応を推奨する。

軽微な UI バグ（5 番目フェーズセルのボーダー欠落）と仕様からの逸脱（subtitle に role が未表示）も修正対象として記録した。high / critical 指摘はないため、verdict は **approved**。
