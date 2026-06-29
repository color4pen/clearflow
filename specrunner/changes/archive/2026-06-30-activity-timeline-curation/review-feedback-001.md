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
| 1 | high | correctness | `src/application/usecases/getDealActivity.ts:86-90` | Invoice の `targetInfoMap` に `href` が設定されない。要件 #5「リンクのある対象（商談・契約・請求）はクリックで詳細へ遷移できる」のうち請求が欠落。deal / meeting / contract には `href` が設定されているのに対し invoice だけ欠落し、UX の非対称が生じる。`inv.contractId` は取得済みで `/contracts/${inv.contractId}/invoices/${inv.id}` として href を構築可能。 | `invoices.map` の結果に `href: \`/contracts/${inv.contractId}/invoices/${inv.id}\`` を追加する | yes |
| 2 | low | testing | `src/__tests__/usecases/dealActivity.dynamic.test.ts:500` | `it("集約後の件数が ACTIVITY_TIMELINE_LIMIT 以下の場合はすべて返される"` のタイトルが逆。実際は「40 件が LIMIT(30) で切り捨てられる」シナリオ（TC-012 相当）をテストしており、TC-011 と TC-012 のタイトルが入れ替わった状態になっている。 | `it` の説明文を「集約後も ACTIVITY_TIMELINE_LIMIT を超える場合は上限件数で切り捨てられる」に修正する | yes |
| 3 | low | testing | `src/application/usecases/updateInvoiceStatus.ts` | 受け入れ基準「`invoice.update_status` の metadata に `{ fromStatus, toStatus }` が記録されることを実行テストで固定する」に対して、実行テストが存在しない。`AuditMetadataMap` の型制約でコンパイル時保証はあるが、`recordAudit` への引数を runtime で assert するテストがない。 | `updateInvoiceStatus` を対象とした動的テストを追加し、`recordAudit` が `{ fromStatus, toStatus }` を含む metadata で呼ばれることを検証する | yes |
| 4 | low | architecture | `src/lib/activityLabels.ts:3-6` | `lib` 層が `app/(dashboard)/labels.ts` をインポートしており、lib→app の逆方向依存が生じている。ただし tasks.md T-06 で「`src/app/(dashboard)/labels.ts` から import」と明示されており、アーキテクト承認済みの実装。他の lib ファイルにはこのパターンなし（孤立した例外）。 | 今サイクルでの対応不要。将来的に label 定数を `src/lib/domainLabels.ts` へ移動することで依存方向を解消できる。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 7 | 0.30 |
| security | 9 | 0.25 |
| architecture | 8 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 7.95

## Summary

全体的な実装品質は高い。ホワイトリスト方式のフィルタ（`TIMELINE_ACTIONS`）、純粋関数による集約ロジック（`aggregateTimeline`）、`mock.module` 方式の動的テスト（23 ケース）、`AuditMetadataMap` を活用した型安全な設計など、設計意図を忠実に実装している。`bun test` (1493 pass / 0 fail) / `typecheck` / `build` / `lint` がすべて green。

**要修正（F-01）**: `targetInfoMap` で invoice に `href` が設定されていない。要件 #5「リンクのある対象（商談・契約・請求）はクリックで詳細へ遷移できる」に違反。deal / meeting / contract に対して設定されている一方、invoice だけ欠落しており UX 上の非対称が生じる。`inv.contractId` は取得済みのため修正は 1 行。

F-02（テストタイトル修正）・F-03（TC-015 実行テスト追加）は品質改善として対応を推奨する。F-04（lib→app 依存）はアーキテクト承認済みのため今サイクルでの対応不要。
