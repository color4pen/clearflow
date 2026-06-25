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
| 1 | medium | correctness | `src/app/(dashboard)/deals/[id]/page.tsx` | `canChangePhase=true` かつ `deal.phase` が "won" または "lost" の場合、行 161 の条件 `{canChangePhase && (<SectionCard>...</SectionCard>)}` が true になり SectionCard が描画されるが、内部の `DealPhaseActions` は `TERMINAL_PHASES.includes(deal.phase)` により null を返す。結果として空の SectionCard（p-3 のパディングだけ）が左カラムに表示される。T-07 受け入れ基準「won/lost の場合はセクション非表示」に違反 | 条件を `{canChangePhase && !["won", "lost"].includes(deal.phase) && (<SectionCard>...</SectionCard>)}` に変更するか、`DealPhaseActions` に合わせて `NON_TERMINAL_PHASES.includes(deal.phase as DealPhase)` チェックを追加する | yes |
| 2 | low | maintainability | `src/app/(dashboard)/deals/[id]/DealHeaderActions.tsx` | `updateDealPhaseAction` の返却値をチェックせずに `router.refresh()` を呼んでいる（行 27-29）。アクションが失敗した場合もリフレッシュだけ実行され、エラーメッセージが表示されない。同ブランチの `DealPhaseActions` は `result.success` を確認してエラー表示する実装になっており不整合がある | `const result = await updateDealPhaseAction(dealId, formData)` として返却値を受け取り、`if (!result.success)` 時はエラーメッセージを state に格納して表示し、`router.refresh()` は `else` 節で呼ぶ。`DealPhaseActions` のパターンに合わせる | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.40

## Summary

全体的に実装品質は高く、仕様・タスクに対する網羅性も良好。build / typecheck / test / lint が全フェーズ pass しており、基本的な品質基準はクリアしている。

修正が必要な点は 2 つ：

1. **中優先度**: 詳細ページのフェーズ変更セクション（`page.tsx`）で、`canChangePhase=true` かつ終端フェーズ（won/lost）の組み合わせ時に空の `SectionCard` が描画される。`DealPhaseActions` コンポーネントは内部で null を返すが、その外側のラッパーカードが表示されてしまう。T-07 の受け入れ基準「won/lost の場合はセクション非表示」に直接違反するため要修正。

2. **低優先度**: `DealHeaderActions` の受注/失注ボタンの `handleTransition` がアクション失敗時にエラーを無視する。`DealPhaseActions` は同一パターンでエラー処理を行っており、同ブランチ内での実装の不整合として修正を推奨する。

その他の実装判断（`getPipelineSummary` による 1 クエリ統合、Server/Client Component 分離、`DealsFilter` の `searchParams` ベース URL 更新、`DealInfoSection` の `isEditing` state 切替、契約ヘッダーの緑背景適用）はすべて設計書・タスク定義に適合している。
