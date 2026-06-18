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
| 1 | high | testing | `src/infrastructure/repositories/requestRepository.ts` | test-cases.md に計画した automated 7 件（TC-021/TC-022 は must、TC-008/TC-011/TC-012/TC-032/TC-033 は should）が一切追加されていない。特に `findAllWithStepsByOrganization` の Map ベースのグルーピングロジックは非自明な新規コードであり、完全に無テスト。本関数はリクエスト一覧のたびに呼ばれ、承認進捗データの表示に直結する。 | (1) `src/__tests__/infrastructure/requestRepository.test.ts` を新規作成し、モック DB 行を入力に `findAllWithStepsByOrganization` のグルーピングロジックをユニットテストする（複数 request × 複数 step の行が正しく集約されること、step のない request でも `approvalSteps: []` が返ることなど）。(2) `src/__tests__/ui/statusUtils.test.ts` を新規作成し TC-008/TC-011/TC-012 をカバー。(3) `projectStructure.test.ts` に TC-021/TC-032/TC-033 を静的ファイル検査テストとして追加。 | yes |
| 2 | low | correctness | `src/app/(dashboard)/requests/BulkApprovalPanel.tsx` | TC-020（should）: 一覧テーブルに行単位のインラインアクションリンクがない。オリジナル要件の要件 3 に「アクション（承認/却下）はインラインのテキストリンク（`text-blue-600 text-xs underline`）にする」と明記されているが、tasks.md T-05 チェックリストに含まれておらず実装漏れとなっている。TC-020 は test-cases.md に should 優先度で記録済み。 | テーブルに「アクション」列を追加し、`status === "pending"` の行に承認・却下の Server Action を呼び出すインラインテキストリンクを `text-blue-600 text-xs underline` スタイルで表示する。スコープ外と判断する場合は tasks.md に明示的に記録し TC-020 を could 以下に降格する。 | yes |
| 3 | low | maintainability | `specrunner/changes/ui-business-style/design.md` | design.md D5 に「設定リンクも全ロールに表示する」と記述されているが、tasks.md T-03 および spec.md では「admin のみ表示」と逆の方針になっている。実装は tasks.md/spec.md に従っており正しい。設計ドキュメントに残った不整合。 | design.md D5 の当該箇所を「admin のみ表示（settings/layout.tsx が非 admin を /requests にリダイレクトするため全ロールへのリンク表示は機能しない）」に修正する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 7 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 3 | 0.10 |

- **total**: 7.55

## Summary

実装品質は全体的に高い。受け入れ基準はすべて通過し、build/typecheck/lint/test も green。設計判断（styles.ts による定数共通化・statusUtils.ts への抽出・SettingsNav Client Component 化・findAllWithStepsByOrganization による N+1 回避）はいずれも設計書通りに正確に実装されている。

ブロッカーは testing カテゴリのみ。test-cases.md に計画した 7 件の automated test が実装されておらず、そのうち 2 件（TC-021、TC-022）は must 優先度。特に `findAllWithStepsByOrganization` のグルーピングロジックは「左外部 JOIN の結果行を requestId でグループ化する」という非自明なアルゴリズムであり、テストなしで本番に入れるのはリスクがある。

F-002（インラインアクション列）は should 優先度であり、タスクに含まれていなかった可能性があるため要確認。

