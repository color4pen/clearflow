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
| 1 | low | testing | `src/__tests__/usecases/dealActivity.dynamic.test.ts:481` | iter-001 F-02 未修正。テストタイトル「集約後の件数が ACTIVITY_TIMELINE_LIMIT 以下の場合はすべて返される」が、実際の振る舞い（40件 distinct ログ → 集約後も40件 → 上限30件で切り捨て）と逆になっている。TC-012（切り捨て）のシナリオをテストしているが、TC-011（全件返却）のタイトルになっており読み手に混乱を与える。 | `it` の説明を「集約後も ACTIVITY_TIMELINE_LIMIT を超える場合は上限件数で切り捨てられる」に修正する | yes |
| 2 | low | testing | `src/application/usecases/updateInvoiceStatus.ts` | iter-001 F-03 未修正。受け入れ基準「`invoice.update_status` の metadata に `{ fromStatus, toStatus }` が記録されることを実行テストで固定する」に対する動的テストが存在しない。`AuditMetadataMap` のコンパイル時型制約による保証はあるが、`recordAudit` への引数を runtime で assert するテストがない。`invoiceManagement.test.ts` の静的検証（readSrc/toContain）は「振る舞いは `.dynamic.test.ts` の `mock.module` 方式で実行して assert する」の要件を満たさない。 | `updateInvoiceStatus.dynamic.test.ts` を追加し、`recordAudit` が `{ fromStatus: invoice.status, toStatus: data.newStatus }` を含む metadata で呼ばれることを `mock.module` 方式で検証する | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 8 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.75

## Summary

**iter-001 F-01（invoice href 欠落）は修正済み**。`getDealActivity.ts` の `targetInfoMap` に `href: \`/contracts/${inv.contractId}/invoices/${inv.id}\`` が追加され、要件 #5「リンクのある対象（商談・契約・請求）はクリックで詳細へ遷移できる」を満たすようになった。deal / meeting / contract / invoice の全対象でリンクが設定され対称性も確保されている。

残存課題は **F-02**（テストタイトル誤記）と **F-03**（`updateInvoiceStatus` の metadata 記録に関する実行テスト欠落）のいずれも `low` severity であり、正確性や動作には影響しない。実装自体（`aggregateTimeline`・`getDealActivity`・`DealActivitySection`・`AuditMetadataMap` 型制約・ラベル整備）は設計意図を忠実に実現しており、`bun test` (1493 pass / 0 fail) / `typecheck` / `build` / `lint` もすべて green。`critical` / `high` 所見はゼロ。

