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
| 1 | MEDIUM | Reference Error | 背景・現状コードの前提 | `docs/design/Clearflow.dc.html` はリポジトリに存在しない。実際のデザイン定義は `docs/design/screens/revenue.md` にある。 | 実装者は `docs/design/Clearflow.dc.html` を参照しようとすると見つからないが、request.md の要件記述と `docs/design/screens/revenue.md` で設計意図は完全に把握できるため、ブロッカーにはならない。参照先を `docs/design/screens/revenue.md` に修正することを推奨する。 |
| 2 | MEDIUM | Scope Ambiguity | 要件 1（確定見込み KPI） | 「確定見込み（契約 + 請求予定の金額）」KPI カードに必要なデータが現在の `RevenueDashboard` 型・`revenueRepository` に存在しない。`getRevenueDashboard` が返すのは `currentMonthRevenue`（入金済み）と `pipelineSummary`（案件見込み）のみで、確定済み契約ベースの未請求・請求予定金額クエリがない。スコープ外に「ビジネスロジックの変更」を挙げているが、このカードを実データで表示するには新規リポジトリクエリが必要。 | 実装者は (a) ¥0 またはプレースホルダーで表示する（受け入れ基準「3 カラム KPI カードが表示される」は満たす）か、(b) 新規クエリを追加してリアルデータを表示するか、いずれかを選択できる。spec で意図を明示すると実装ブレが減る。どちらでも受け入れ基準は通過可能なため、ブロッカーではない。 |
| 3 | LOW | Clarity | 要件 4（売上明細フィルタバー） | 「集計軸切替のタブ」と記述されているが、現在の実装は `<select>` ドロップダウン。タブ UI への切替は明確な UI 変更指示として読める。 | 実装者への補足: `<select>` をタブボタン群に変更することが求められている。現行 `DataTable` コンポーネントや共通 Tab コンポーネントの有無を確認してから実装すること。 |
| 4 | LOW | Clarity | 要件 6（予実管理 — 目標設定） | 「期間選択（月次/四半期/年次）」の表現が、(a) フリー日付入力の代替か (b) フリー日付に加えてプリセットを追加するのか曖昧。現在の実装はフリー日付入力（開始日/終了日）。 | プリセット選択（月次/四半期/年次）を選ぶと自動的に対応する日付レンジが入力されるヘルパー UI として実装するのが自然。フリー入力を残した上での追加が推奨。 |
