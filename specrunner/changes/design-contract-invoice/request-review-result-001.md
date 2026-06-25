# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | 参照誤り | request.md > 背景 | `docs/design/Clearflow.dc.html` はリポジトリに存在しない。実際の設計仕様は `docs/design/screens/contract.md` と `docs/design/screens/invoice.md` に分かれて存在する。実装者が参照先を見つけられない可能性がある | 実装者は `docs/design/screens/contract.md` および `docs/design/screens/invoice.md` を参照すること。本 request の要件記述に設計内容が inline で記載されているため実装上の支障は軽微 |
| 2 | MEDIUM | スコープ不明確 | request.md > 要件1 (契約一覧 案件名カラム) | 案件名カラム追加には `ContractWithClient` 型への `dealName` フィールド追加と `contractRepository.findAllByOrganization` での `deals` テーブル JOIN が必要。これらは現行コードに存在せず、要件には明示されていない | 実装者はドメインモデル型（`ContractWithClient`）と repository の JOIN クエリを拡張して `dealName` を取得すること。ビジネスロジック変更ではなく view-layer の型拡張として扱ってよい |
| 3 | MEDIUM | スコープ不明確 | request.md > 要件2 (承認待ちバナー) | 契約詳細の要件に「承認待ちバナー（該当時）」が含まれるが、`Contract` ドメインモデルに承認状態フィールドが存在せず、受け入れ基準にも記載がない。実装可否と範囲が曖昧 | 承認待ちバナーは受け入れ基準に含まれていないため、今回のイテレーションでは UI レイアウト上の placeholder（非表示または条件付き表示のスタブ）として実装し、承認状態の詳細は別 request に委ねる |
| 4 | LOW | 表現明確化 | request.md > 要件3 (パンくず) | 現在の請求詳細画面のパンくずは「契約一覧 > 契約詳細 > 請求詳細」と表示している。要件では「契約一覧 > 契約名 > 請求詳細」と記載されており、リンクテキストを契約名（`contract.title`）に変更することが必要 | 実装時は `getInvoice` の戻り値 `contract.title` をパンくずのリンクテキストに使用すること。データは既に取得済みのため追加クエリ不要 |
