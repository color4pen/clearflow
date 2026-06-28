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
| 1 | MEDIUM | Schema integrity | 要件 1 — watches テーブル定義 | `watches` テーブルに `(user_id, deal_id)` の一意制約が明示されていない。案件の作成者が同時に担当者（assigneeId）でもある場合、createDeal と updateDeal の両方で自動 watch 行が INSERT され、同一ユーザーに対して重複 watch 行が生じる。重複行があると `getNotifications` が同一案件の通知を二重に導出する。 | design/spec に `UNIQUE (user_id, deal_id)` 制約（または upsert / insert-if-not-exists セマンティクス）を明示する。 |
| 2 | MEDIUM | Implementation gap | 要件 3 — getNotifications usecase | 既存の `auditLogRepository.findByTargets` は `afterDate` フィルタを持たない。要件「watch 開始（watches.created_at）以降のものに限る」を満たすには、watch ごとに異なる開始日を考慮する必要があるが、現 API はその引数形式をサポートしていない。実装方針（リポジトリ拡張 / インメモリフィルタ / per-watch クエリ）が request に指定されていないため、design step での明示が必要。 | design.md にフィルタ戦略を記載する。v1 規模であればインメモリフィルタが最もシンプル（取得件数に上限を設ける）。将来性を重視するなら `findByTargets` に `afterDate` オプションを追加する。 |
| 3 | LOW | UI specification | 要件 4 — 通知センター UI | 「ダッシュボードのナビに未読バッジ＋通知一覧を追加」の UI コンポーネント形式が未指定。ドロップダウンポップオーバー、スライドパネル、専用ページ（`/notifications`）のいずれかによって実装量と SidebarNav（client component）のデータフロー設計が変わる。 | どの UI 形式を採用するか design step で選択・記載する。既存の `hasBadge` パターン（SidebarNav）を参考に、バッジはナビに置き一覧はドロップダウンとするのが最小差分で実装しやすい。 |
| 4 | LOW | Scope clarity | 要件 3 — 対象アクション | `getDealActivity` は invoice（`invoice.create` 等）も追跡対象に含むが、`getNotifications` の通知対象アクションから `invoice.create` が除外されている。意図的なスコープ除外であれば記述は一貫しているが、明示的な除外理由がないため実装者が迷う可能性がある。 | スコープ外に「請求（invoice）のイベントは通知対象外」と一行補記すると実装者の解釈ブレを防げる。 |
