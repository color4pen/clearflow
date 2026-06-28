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
| 1 | MEDIUM | Design Gap | request.md 要件1 / `getDealActivity.ts` | `getDealActivity` 内で `deal` エンティティ自体は取得されておらず、`dealId` のみがパラメータとして受け取られる。要件1は「既に解決済みのエンティティから組む（新規リポジトリ取得を増やさない）」と定めているが、`deal.title`（deal ラベルに必要）は現行 usecase 内で解決されていない。マップに deal エントリを含めるためには、(a) dealRepository 呼び出しを追加する（制約違反）、(b) `getDealActivity` の引数に `dealTitle` を追加する、または (c) ラベルマップの deal エントリを呼び出し元（Page）で補完する、のいずれかが必要になる。 | spec 設計フェーズで deal ラベルの取得方法を明示すること。最もシンプルな解は `getDealActivity` の引数に `deal: { id: string; title: string }` を受け取る形に変更し、呼び出し元 Page が既に持っている deal オブジェクトを渡す方法。制約「新規リポジトリ取得を増やさない」は維持できる。 |
| 2 | LOW | Factual Clarification | request.md 現状コードの前提 / `src/app/(dashboard)/contracts/[id]/invoices/[invoiceId]/page.tsx` | 「invoice / action_item / deal_contact は詳細ページ無し」と記載されているが、invoice の詳細ページ（`/contracts/[id]/invoices/[invoiceId]`）は実際に存在する。また `Invoice` モデルは `contractId` フィールドを持つため、すでに解決済みの invoice エンティティから URL を組み立てることも技術的には可能。 | invoice リンクを意図的に省くのであれば、その理由（UX 上の判断、ナビゲーション複雑性の排除など）を request.md または spec に明記しておくと、後続の spec-review や実装者が迷わない。 |
| 3 | LOW | Clarity | request.md 要件2 / `src/lib/meetingLabels.ts` | meeting ラベルの形式を「種別+日時」と定めているが、日時のフォーマット（例: `ヒアリング 2024/01/15` vs `ヒアリング（2024年1月15日）`）が未指定。`meetingTypeLabels` は既存の日本語ラベルマップが利用可能。 | spec 記述時に日時フォーマット例（ロケールや区切り文字）を 1 例明示すること。 |
