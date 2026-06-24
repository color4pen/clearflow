# Regression Gate Result — Iteration 1

- **change**: dashboard
- **iteration**: 1
- **verdict**: approved

## Findings Verification

### [MEDIUM] TC-052・TC-053（unit/must）がテスト未実装 — stale deal フィルタの境界条件

- **status**: fixed — still present
- **evidence**:
  - `src/__tests__/usecases/staleDealFilter.test.ts` が新規追加されており、TC-052・TC-053 の両テストケースを静的検証で網羅している。
  - `src/app/(dashboard)/dashboard/page.tsx` の実装:
    - `14 * 24 * 60 * 60 * 1000`（閾値 14 日）が存在する（TC-052）
    - `fourteenDaysAgo` 変数が存在する（TC-052）
    - `deal.updatedAt <= fourteenDaysAgo`（境界含む比較）が存在する（TC-052）
    - `deal.phase !== "won"` が存在する（TC-053）
    - `deal.phase !== "lost"` が存在する（TC-053）
    - 両条件が `&&` で結合されている（TC-053）
  - テストが参照する実装と staleDealFilter.test.ts の期待値は一致しており、リグレッションなし。

### [LOW] 全テストが静的解析（ソース文字列照合）のみで runtime 振る舞いを検証していない

- **status**: accepted — still in accepted state
- **evidence**:
  - レビュー時の判断「今回の範囲では許容可能」が維持されている。
  - 新規追加の `staleDealFilter.test.ts` も同じ静的解析アプローチを採用しており、既存方針と一貫している。
  - `dashboardActions.test.ts` / `pipelineSummary.test.ts` / `listInvoicesByOrganization.test.ts` はいずれも静的解析ベースのままであり、意図的選択として継続している。
  - runtime 検証への変換は今回スコープ外と判断されており、リグレッションには該当しない。

## Summary

検出されたリグレッションなし。2 件の finding はいずれも修正済み／許容済みの状態が維持されている。
